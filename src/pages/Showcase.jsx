import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react'
import SEO from '../components/SEO'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import getSupabaseClient from '../lib/supabaseClient'
import '../styles/Showcase.css'

const PAGE_SIZE = 20 // 4 列 * 5 行
const STORAGE_BUCKET = 'forum_uploads'

/**
 * 论坛使用的 Supabase 表结构（需在数据库中创建）
 *
 * forum_posts:
 *   - id (uuid, primary key, default uuid_generate_v4())
 *   - user_id (uuid, references auth.users)
 *   - title (text)
 *   - prompt (text)
 *   - tags (text[] 或 jsonb)
 *   - image_url (text)
 *   - author_name (text)
 *   - author_avatar (text, 可选)
 *   - favorites_count (int, default 0)
 *   - follows_count (int, default 0)
 *   - rating_average (numeric, default 0)
 *   - rating_count (int, default 0)
 *   - comments_count (int, default 0)
 *   - created_at (timestamp, default now())
 *
 * forum_comments:
 *   - id, post_id, user_id, content, author_name, author_avatar, created_at
 *
 * forum_post_favorites / forum_post_follows:
 *   - id, post_id, user_id, created_at (唯一约束 post_id + user_id)
 *
 * forum_post_ratings:
 *   - id, post_id, user_id, rating (1-5), created_at
 */

const Showcase = () => {
  const { t, getLocalizedPath } = useLanguage()
  const { user, isLoggedIn } = useAuth()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const seoData = t('seo.showcase')
  
  const [posts, setPosts] = useState([])
  const [totalItems, setTotalItems] = useState(0)
  const [sortBy, setSortBy] = useState('latest')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [comments, setComments] = useState([])
  const [commentInput, setCommentInput] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  const [formState, setFormState] = useState({
    title: '',
    prompt: '',
    tags: '',
    imageFile: null,
    imagePreview: '',
    submitting: false,
    error: ''
  })

  const [userFavorites, setUserFavorites] = useState({})
  const [userFollows, setUserFollows] = useState({})
  const [userRatings, setUserRatings] = useState({})
  const [copyFeedback, setCopyFeedback] = useState('')

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE))

  const paginationRange = useMemo(() => {
    const pages = []
    const start = Math.max(1, currentPage - 2)
    const end = Math.min(totalPages, start + 4)
    for (let page = start; page <= end; page += 1) {
      pages.push(page)
    }
    return pages
  }, [currentPage, totalPages])

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchKeyword.trim())
      setCurrentPage(1)
    }, 350)

    return () => clearTimeout(handler)
  }, [searchKeyword])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const sortColumn = sortBy === 'latest' ? 'created_at' : 'favorites_count'

      let query = supabase
        .from('forum_posts')
        .select(
          'id,title,prompt,tags,image_url,author_name,author_avatar,favorites_count,follows_count,rating_average,rating_count,comments_count,created_at',
          { count: 'exact' }
        )
        .order(sortColumn, { ascending: false })
        .range(from, to)

      if (debouncedSearch) {
        const keyword = debouncedSearch.replace(/'/g, "''")
        query = query.or(`title.ilike.%${keyword}%,prompt.ilike.%${keyword}%,tags::text.ilike.%${keyword}%`)
      }

      const { data, error: fetchError, count } = await query

      if (fetchError) {
        throw fetchError
      }

      setPosts(data || [])
      setTotalItems(count || 0)

      if (isLoggedIn && (data || []).length > 0) {
        await fetchUserReactions((data || []).map((post) => post.id))
      } else if (!isLoggedIn) {
        setUserFavorites({})
        setUserFollows({})
        setUserRatings({})
      }
    } catch (fetchErr) {
      console.error('Failed to load forum posts:', fetchErr)
      setError(fetchErr.message || t('showcase.genericError'))
    } finally {
      setLoading(false)
    }
  }, [supabase, currentPage, sortBy, debouncedSearch, isLoggedIn, t])

  const fetchUserReactions = useCallback(
    async (postIds) => {
      if (!user || postIds.length === 0) return

      try {
        const [favoriteRes, followRes, ratingRes] = await Promise.all([
          supabase.from('forum_post_favorites').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('forum_post_follows').select('post_id').eq('user_id', user.id).in('post_id', postIds),
          supabase.from('forum_post_ratings').select('post_id,rating').eq('user_id', user.id).in('post_id', postIds)
        ])

        const favMap = {}
        favoriteRes.data?.forEach((row) => {
          favMap[row.post_id] = true
        })

        const followMap = {}
        followRes.data?.forEach((row) => {
          followMap[row.post_id] = true
        })

        const ratingMap = {}
        ratingRes.data?.forEach((row) => {
          ratingMap[row.post_id] = row.rating
        })

        setUserFavorites(favMap)
        setUserFollows(followMap)
        setUserRatings(ratingMap)
      } catch (reactionErr) {
        console.warn('Failed to fetch user reactions:', reactionErr)
      }
    },
    [supabase, user]
  )

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleOpenSubmission = () => {
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }
    setFormState({
      title: '',
      prompt: '',
      tags: '',
      imageFile: null,
      imagePreview: '',
      submitting: false,
      error: ''
    })
    setShowSubmissionModal(true)
  }

  const handleCloseSubmission = () => {
    setShowSubmissionModal(false)
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setFormState((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: previewUrl
    }))
  }

  useEffect(() => {
    return () => {
      if (formState.imagePreview) {
        URL.revokeObjectURL(formState.imagePreview)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.imagePreview])

  const uploadImage = async (file) => {
    if (!file) {
      throw new Error(t('showcase.formImageRequired'))
    }
    const ext = file.name.split('.').pop()
    const filePath = `${user?.id || 'anonymous'}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)
    return data?.publicUrl
  }

  const handleSubmitPost = async () => {
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }

    if (!formState.prompt.trim() || !formState.imageFile) {
      setFormState((prev) => ({
        ...prev,
        error: t('showcase.formMissingFields')
      }))
      return
    }

    setFormState((prev) => ({
      ...prev,
      submitting: true,
      error: ''
    }))

    try {
      const imageUrl = await uploadImage(formState.imageFile)
      const tagsArray = formState.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)

      const { error: insertError } = await supabase.from('forum_posts').insert({
        title: formState.title.trim() || t('showcase.defaultPostTitle', { name: user?.name || 'User' }),
        prompt: formState.prompt.trim(),
        tags: tagsArray,
        image_url: imageUrl,
        user_id: user?.id,
        author_name: user?.name || 'User',
        author_avatar: user?.avatar || null
      })

      if (insertError) {
        throw insertError
      }

      setShowSubmissionModal(false)
      await fetchPosts()
    } catch (submitErr) {
      console.error('Submit post failed:', submitErr)
      setFormState((prev) => ({
        ...prev,
        error: submitErr.message || t('showcase.genericError')
      }))
    } finally {
      setFormState((prev) => ({
        ...prev,
        submitting: false
      }))
    }
  }

  const toggleFavorite = async (postId) => {
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }

    const currentlyFavorite = userFavorites[postId]
    try {
      if (currentlyFavorite) {
        await supabase.from('forum_post_favorites').delete().eq('post_id', postId).eq('user_id', user.id)
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, favorites_count: Math.max(0, (post.favorites_count || 0) - 1) }
              : post
          )
        )
      } else {
        await supabase.from('forum_post_favorites').insert({ post_id: postId, user_id: user.id })
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, favorites_count: (post.favorites_count || 0) + 1 } : post
          )
        )
      }
      setUserFavorites((prev) => ({
        ...prev,
        [postId]: !currentlyFavorite
      }))
    } catch (favErr) {
      console.warn('Favorite toggle failed:', favErr)
    }
  }

  const toggleFollow = async (postId) => {
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }
    const currentlyFollowing = userFollows[postId]
    try {
      if (currentlyFollowing) {
        await supabase.from('forum_post_follows').delete().eq('post_id', postId).eq('user_id', user.id)
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, follows_count: Math.max(0, (post.follows_count || 0) - 1) } : post
          )
        )
      } else {
        await supabase.from('forum_post_follows').insert({ post_id: postId, user_id: user.id })
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId ? { ...post, follows_count: (post.follows_count || 0) + 1 } : post
          )
        )
      }
      setUserFollows((prev) => ({
        ...prev,
        [postId]: !currentlyFollowing
      }))
    } catch (followErr) {
      console.warn('Follow toggle failed:', followErr)
    }
  }

  const handleRating = async (postId, ratingValue) => {
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }

    try {
      await supabase.from('forum_post_ratings').upsert(
        {
          post_id: postId,
          user_id: user.id,
          rating: ratingValue
        },
        {
          onConflict: 'post_id,user_id'
        }
      )

      setUserRatings((prev) => ({
        ...prev,
        [postId]: ratingValue
      }))

      await fetchPosts()
    } catch (ratingErr) {
      console.warn('Rating failed:', ratingErr)
    }
  }

  const openPostDetail = (post) => {
    setSelectedPost(post)
    setShowDetailModal(true)
    fetchComments(post.id)
  }

  const closePostDetail = () => {
    setShowDetailModal(false)
    setSelectedPost(null)
    setComments([])
    setCommentInput('')
  }

  const fetchComments = async (postId) => {
    try {
      const { data, error: commentsError } = await supabase
        .from('forum_comments')
        .select('id,content,created_at,author_name,author_avatar,user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (commentsError) {
        throw commentsError
      }

      setComments(data || [])
    } catch (commentsErr) {
      console.warn('Failed to load comments:', commentsErr)
    }
  }

  const handleCommentSubmit = async () => {
    if (!selectedPost || !commentInput.trim()) return
    if (!isLoggedIn) {
      alert(t('showcase.loginReminder'))
      return
    }

    setCommentSubmitting(true)
    try {
      const { error: commentError } = await supabase.from('forum_comments').insert({
        post_id: selectedPost.id,
        user_id: user.id,
        content: commentInput.trim(),
        author_name: user.name || 'User',
        author_avatar: user.avatar || null
      })

      if (commentError) {
        throw commentError
      }

      setCommentInput('')
      await fetchComments(selectedPost.id)
      await fetchPosts()
    } catch (commentErr) {
      console.warn('Failed to submit comment:', commentErr)
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleCopyPrompt = async (event, promptText) => {
    event.stopPropagation()
    try {
      await navigator.clipboard.writeText(promptText)
      setCopyFeedback(t('showcase.copySuccess'))
    } catch (copyErr) {
      console.warn('Copy failed:', copyErr)
      setCopyFeedback(t('showcase.copyFailed'))
    } finally {
      setTimeout(() => setCopyFeedback(''), 1500)
    }
  }

  const formattedDate = (dateValue) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(dateValue))
    } catch {
      return ''
    }
  }

  const renderStars = (postId, averageRating) => {
    const userRating = userRatings[postId] || 0
    return (
      <div className="forum-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            className={`rating-star ${userRating >= star ? 'rated' : ''}`}
            aria-label={`${t('showcase.ratingLabel')} ${star}`}
            onClick={(event) => {
              event.stopPropagation()
              handleRating(postId, star)
            }}
          >
            ★
          </button>
        ))}
        <span className="rating-average">{Number(averageRating || 0).toFixed(1)}</span>
      </div>
    )
  }

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="forum-page">
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        path={getLocalizedPath('/showcase')}
      />
      
      <div className="forum-container">
        <header className="forum-header">
          <h1>Nano Banana · {t('showcase.forumTitle')}</h1>
          <p>{t('showcase.forumSubtitle')}</p>
        </header>

        <div className="forum-toolbar">
          <div className="forum-toolbar-main">
            <div className="forum-nav">
              <button
                type="button"
                className={sortBy === 'latest' ? 'active' : ''}
                onClick={() => setSortBy('latest')}
              >
                {t('showcase.navLatest')}
              </button>
              <button
                type="button"
                className={sortBy === 'hot' ? 'active' : ''}
                onClick={() => setSortBy('hot')}
              >
                {t('showcase.navTrending')}
              </button>
            </div>

            <div className="forum-search">
              <input
                type="text"
                value={searchKeyword}
                placeholder={t('showcase.searchPlaceholder')}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
            </div>
          </div>

          <button type="button" className="forum-submit" onClick={handleOpenSubmission}>
            {t('showcase.submitButton')}
          </button>
        </div>

        {copyFeedback && <div className="forum-toast">{copyFeedback}</div>}

        {loading ? (
          <div className="forum-loading">{t('common.loading')}</div>
        ) : error ? (
          <div className="forum-error">{error}</div>
        ) : posts.length === 0 ? (
          <div className="forum-empty">
            <h3>{t('showcase.emptyStateTitle')}</h3>
            <p>{t('showcase.emptyStateDescription')}</p>
          </div>
        ) : (
          <>
            <div className="forum-grid">
              {posts.map((post) => (
                <article key={post.id} className="forum-card" onClick={() => openPostDetail(post)}>
                  <div className="forum-card-image" role="presentation">
                    <img src={post.image_url} alt={post.title} loading="lazy" />
                    <button
                      type="button"
                      className="copy-button"
                      onClick={(event) => handleCopyPrompt(event, post.prompt)}
                    >
                      {t('showcase.copyPrompt')}
                    </button>
                  </div>
                  <div className="forum-card-body">
                    <div className="forum-card-meta">
                      <div className="avatar">
                        {post.author_avatar ? (
                          <img src={post.author_avatar} alt={post.author_name} />
                        ) : (
                          (post.author_name || 'User')
                            .split(' ')
                            .map((part) => part.charAt(0))
                            .join('')
                            .slice(0, 2)
                        )}
                      </div>
                      <div>
                        <h3>{post.title}</h3>
                        <p>{formattedDate(post.created_at)}</p>
                      </div>
                    </div>
                    <p className="forum-card-prompt">{post.prompt}</p>
                    <div className="forum-card-tags">
                      {(post.tags || []).map((tag) => (
                        <span key={`${post.id}-${tag}`}>#{tag}</span>
                      ))}
                    </div>
                    <div className="forum-card-actions">
                      <button
                        type="button"
                        className={`icon-button ${userFavorites[post.id] ? 'active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleFavorite(post.id)
                        }}
                      >
                        ♥
                        <span>{post.favorites_count || 0}</span>
                      </button>
                      <button
                        type="button"
                        className={`icon-button ${userFollows[post.id] ? 'active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleFollow(post.id)
                        }}
                      >
                        ★
                        <span>{post.follows_count || 0}</span>
                      </button>
                      {renderStars(post.id, post.rating_average)}
                      <div className="comment-count">
                        💬 <span>{post.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="forum-pagination">
              <button type="button" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                {t('showcase.paginationPrev')}
              </button>
              {paginationRange.map((page) => (
                <button
                  type="button"
                  key={page}
                  className={page === currentPage ? 'active' : ''}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                {t('showcase.paginationNext')}
              </button>
            </div>
          </>
        )}
      </div>

      {showSubmissionModal && (
        <div className="forum-modal" role="dialog" aria-modal="true">
          <div className="forum-modal-content">
            <div className="modal-header">
              <h2>{t('showcase.modalTitle')}</h2>
              <button type="button" className="close-button" onClick={handleCloseSubmission}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <label>
                {t('showcase.modalTitleLabel')}
                <input
                  type="text"
                  value={formState.title}
                  placeholder={t('showcase.modalTitlePlaceholder')}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      title: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                {t('showcase.modalPromptLabel')}
                <textarea
                  value={formState.prompt}
                  placeholder={t('showcase.modalPromptPlaceholder')}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      prompt: event.target.value
                    }))
                  }
                />
              </label>
              <label>
                {t('showcase.modalTagsLabel')}
                <input
                  type="text"
                  value={formState.tags}
                  placeholder={t('showcase.modalTagsPlaceholder')}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      tags: event.target.value
                    }))
                  }
                />
              </label>
              <label className="upload-field">
                {t('showcase.modalImageLabel')}
                <div className="upload-box">
                  {formState.imagePreview ? (
                    <img src={formState.imagePreview} alt="preview" />
                  ) : (
                    <p>{t('showcase.uploadHint')}</p>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
              </label>
              {formState.error && <p className="form-error">{formState.error}</p>}
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={handleCloseSubmission}>
                {t('showcase.modalCancel')}
              </button>
              <button type="button" onClick={handleSubmitPost} disabled={formState.submitting}>
                {formState.submitting ? t('common.loading') : t('showcase.modalSubmit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedPost && (
        <div className="forum-modal detail-modal" role="dialog" aria-modal="true">
          <div className="forum-modal-content large">
            <button type="button" className="close-button" onClick={closePostDetail}>
              ×
            </button>
            <div className="detail-layout">
              <div className="detail-image">
                <img src={selectedPost.image_url} alt={selectedPost.title} />
              </div>
              <div className="detail-info">
                <h2>{selectedPost.title}</h2>
                <p className="detail-author">
                  {selectedPost.author_name} · {formattedDate(selectedPost.created_at)}
                </p>
                <section className="detail-section">
                  <div className="detail-prompt-header">
                    <h3>{t('showcase.detailPromptTitle')}</h3>
                    <button type="button" onClick={(event) => handleCopyPrompt(event, selectedPost.prompt)}>
                      {t('showcase.copyPrompt')}
                    </button>
                  </div>
                  <p className="detail-prompt">{selectedPost.prompt}</p>
                  <div className="detail-tags">
                    {(selectedPost.tags || []).map((tag) => (
                      <span key={`${selectedPost.id}-${tag}`}>#{tag}</span>
                    ))}
                  </div>
                </section>
                <section className="detail-section stats">
                  <div>
                    <span>{t('showcase.favoriteLabel')}</span>
                    <strong>{selectedPost.favorites_count || 0}</strong>
                  </div>
                  <div>
                    <span>{t('showcase.followLabel')}</span>
                    <strong>{selectedPost.follows_count || 0}</strong>
                  </div>
                  <div>
                    <span>{t('showcase.ratingLabel')}</span>
                    <strong>{Number(selectedPost.rating_average || 0).toFixed(1)}</strong>
                </div>
                  <div>
                    <span>{t('showcase.commentCountLabel')}</span>
                    <strong>{selectedPost.comments_count || 0}</strong>
                  </div>
                </section>
                <section className="detail-section">
                  <h3>{t('showcase.detailCommentsTitle')}</h3>
                  <div className="comment-list">
                    {comments.length === 0 ? (
                      <p className="comment-empty">{t('showcase.commentEmpty')}</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="comment-item">
                          <div className="avatar small">
                            {comment.author_avatar ? (
                              <img src={comment.author_avatar} alt={comment.author_name} />
                            ) : (
                              comment.author_name
                                ?.split(' ')
                                .map((part) => part.charAt(0))
                                .join('')
                                .slice(0, 2)
                            )}
                          </div>
                          <div>
                            <div className="comment-meta">
                              <strong>{comment.author_name}</strong>
                              <span>{formattedDate(comment.created_at)}</span>
                            </div>
                            <p>{comment.content}</p>
                </div>
              </div>
                      ))
                    )}
        </div>

                  {isLoggedIn ? (
                    <div className="comment-form">
                      <textarea
                        value={commentInput}
                        placeholder={t('showcase.commentPlaceholder')}
                        onChange={(event) => setCommentInput(event.target.value)}
                      />
                      <button type="button" onClick={handleCommentSubmit} disabled={commentSubmitting}>
                        {commentSubmitting ? t('common.loading') : t('showcase.commentSubmit')}
                      </button>
                    </div>
                  ) : (
                    <p className="comment-login">{t('showcase.commentLoginCta')}</p>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Showcase

