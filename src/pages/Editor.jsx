import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Editor.css'
import modelAPI from '../utils/modelAPI'
import { createGenerationAndCharge, checkCreditsSufficient, getMyCredits, getMyGenerationHistory, enforceGenerationHistoryLimit } from '../services/db'
import { useAuth } from '../contexts/AuthContext'

function Editor() {
  const { t, getLocalizedPath } = useLanguage()
  const { isLoggedIn, user } = useAuth()
  const [activeTab, setActiveTab] = useState('imageEdit')
  const [model, setModel] = useState('Nano Banana')
  const [referenceImages, setReferenceImages] = useState([])
  const [prompts, setPrompts] = useState({
    imageEdit: '',
    textToImage: ''
  })
  const [generatedImages, setGeneratedImages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [historyFilterModel, setHistoryFilterModel] = useState('all')
  const [currentCredits, setCurrentCredits] = useState(null) // 当前点数
  const isGeneratingRef = useRef(false) // 使用 ref 防止重复调用
  const [previewImage, setPreviewImage] = useState(null) // 预览图片 URL
  const [promptCache, setPromptCache] = useState({})

  const IMAGE_EDIT_BLOCKED_MODELS = ['SeeDream-4']

  const currentPrompt = prompts[activeTab] || ''
  const updatePrompt = (value, mode = activeTab) => {
    setPrompts(prev => ({
      ...prev,
      [mode]: value
    }))
  }
  const getPromptCacheKey = (uid) => `generationPromptCache:${uid}`
  const loadPromptCacheFromStorage = (uid) => {
    if (!uid) return {}
    try {
      const raw = localStorage.getItem(getPromptCacheKey(uid))
      return raw ? JSON.parse(raw) : {}
    } catch (err) {
      console.warn('读取 Prompt 缓存失败:', err)
      return {}
    }
  }

  useEffect(() => {
    if (user?.id) {
      setPromptCache(loadPromptCacheFromStorage(user.id))
    } else {
      setPromptCache({})
    }
  }, [user?.id])

  const rememberPromptForGeneration = (generationId, promptValue) => {
    if (!user?.id || !generationId) return
    setPromptCache(prev => {
      const updated = { ...prev, [generationId]: promptValue }
      try {
        localStorage.setItem(getPromptCacheKey(user.id), JSON.stringify(updated))
      } catch (err) {
        console.warn('写入 Prompt 缓存失败:', err)
      }
      return updated
    })
  }
  const isImageEditModelBlocked = activeTab === 'imageEdit' && IMAGE_EDIT_BLOCKED_MODELS.includes(model)

  const seoData = t('seo.editor')

  useEffect(() => {
    if (isImageEditModelBlocked) {
      setModel('Nano Banana')
    }
  }, [isImageEditModelBlocked])

  const computeCost = () => {
    const isTextToImage = activeTab === 'textToImage';
    const m = (model || '').toLowerCase();
    const isNanoBananaPro =
      m === 'nano banana 2 (pro)' ||
      m === 'nano banana 2(pro)' ||
      m === 'nano banana 2 pro' ||
      m === 'nano banana2 (pro)' ||
      m === 'nano banana2 pro';

    if (isTextToImage) {
      if (m === 'nano banana') return 2;
      if (isNanoBananaPro) return 4;
      if (m === 'gpt-5 image mini') return 2;
      if (m === 'gpt-5 image') return 3;
      if (m === 'seedream-4' || m === 'seedream') return 2;
    } else {
      // 图生图（imageEdit）
      if (m === 'nano banana') return 4;
      if (isNanoBananaPro) return 5;
      if (m === 'gpt-5 image' || m === 'gpt-5 image mini') return 3;
      if (m === 'seedream-4' || m === 'seedream') return 2;
    }
    return 0;
  };
  const currentCost = computeCost();

  // 将图片转换为 base64 并保存
  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files.length > 0 && referenceImages.length < 9) {
      const file = e.target.files[0];
      // 检查文件大小（限制为 5MB，避免 localStorage 过大）
      if (file.size > 5 * 1024 * 1024) {
        setError('图片太大，请选择小于 5MB 的图片');
        e.target.value = '';
        return;
      }

      try {
        // 创建 Blob URL 用于显示
        const blobUrl = URL.createObjectURL(file);
        // 转换为 base64 用于保存
        const base64 = await convertImageToBase64(file);

        const newImage = {
          blobUrl: blobUrl,
          base64: base64,
          name: file.name,
          size: file.size
        };

        const updatedImages = [...referenceImages, newImage];
        setReferenceImages(updatedImages);

        // 保存到 localStorage
        saveEditorState({
          prompts,
          referenceImages: updatedImages,
          activeTab,
          model
        });

        e.target.value = '';
      } catch (err) {
        console.error('图片处理失败:', err);
        setError('图片处理失败，请重试');
        e.target.value = '';
      }
    }
  }

  const removeImage = (index) => {
    const newImages = [...referenceImages];
    // 释放 Blob URL
    if (newImages[index]?.blobUrl) {
      URL.revokeObjectURL(newImages[index].blobUrl);
    }
    newImages.splice(index, 1);
    setReferenceImages(newImages);

    // 更新 localStorage
    saveEditorState({
      prompts,
      referenceImages: newImages,
      activeTab,
      model
    });
  }

  // 保存编辑器状态到 localStorage
  const saveEditorState = (state) => {
    try {
      const promptsToSave = state.prompts || prompts;
      const stateToSave = {
        prompts: {
          imageEdit: promptsToSave?.imageEdit || '',
          textToImage: promptsToSave?.textToImage || ''
        },
        activeTab: state.activeTab || 'imageEdit',
        model: state.model || 'Nano Banana',
        // 只保存 base64 数据，不保存 Blob URL（因为 Blob URL 不能持久化）
        referenceImages: (state.referenceImages || []).map(img => {
          // 如果是字符串（旧格式或 base64），直接保存
          if (typeof img === 'string') {
            return {
              base64: img,
              name: 'image',
              size: 0
            };
          }
          // 如果是对象（新格式），提取 base64
          if (typeof img === 'object' && img !== null) {
            return {
              base64: img.base64 || img.blobUrl || '',
              name: img.name || 'image',
              size: img.size || 0
            };
          }
          return {
            base64: '',
            name: 'image',
            size: 0
          };
        })
      };
      localStorage.setItem('editorState', JSON.stringify(stateToSave));
    } catch (err) {
      // 如果存储失败（可能是配额超限），只保存文本内容
      try {
        const promptsToSave = state.prompts || prompts;
        localStorage.setItem('editorImagePrompt', promptsToSave?.imageEdit || '');
        localStorage.setItem('editorTextPrompt', promptsToSave?.textToImage || '');
        localStorage.setItem('editorActiveTab', state.activeTab || 'imageEdit');
        localStorage.setItem('editorModel', state.model || 'Nano Banana');
      } catch (e) {
        console.warn('保存编辑器状态失败:', e);
      }
    }
  };

  // 从 localStorage 恢复编辑器状态
  const loadEditorState = () => {
    try {
      const saved = localStorage.getItem('editorState');
      if (saved) {
        const state = JSON.parse(saved);

        // 恢复提示词
        if (state.prompts) {
          setPrompts({
            imageEdit: state.prompts.imageEdit || '',
            textToImage: state.prompts.textToImage || ''
          });
        } else if (state.prompt) {
          // 兼容旧结构
          setPrompts({
            imageEdit: state.prompt,
            textToImage: state.prompt
          });
        }

        // 恢复模式
        if (state.activeTab) {
          setActiveTab(state.activeTab);
        }

        // 恢复模型
        if (state.model) {
          setModel(state.model);
        }

        // 恢复图片（从 base64 重新创建显示 URL）
        if (state.referenceImages && state.referenceImages.length > 0) {
          const restoredImages = state.referenceImages.map(img => {
            // 处理不同格式
            let base64 = '';
            let name = 'image';
            let size = 0;

            if (typeof img === 'string') {
              // 旧格式：直接是 base64 字符串
              base64 = img;
            } else if (typeof img === 'object' && img !== null) {
              // 新格式：对象
              base64 = img.base64 || img.blobUrl || '';
              name = img.name || 'image';
              size = img.size || 0;
            }

            if (base64) {
              // 如果 base64 不包含 data: 前缀，添加它
              const dataUrl = base64.startsWith('data:')
                ? base64
                : `data:image/jpeg;base64,${base64}`;

              return {
                blobUrl: dataUrl, // 使用 data URL 作为显示 URL
                base64: base64.startsWith('data:') ? base64.split(',')[1] || base64 : base64, // 保存纯 base64
                name: name,
                size: size
              };
            }
            return null;
          }).filter(img => img !== null);

          if (restoredImages.length > 0) {
            setReferenceImages(restoredImages);
          }
        }
      } else {
        // 如果没有完整状态，尝试加载单独的字段（向后兼容）
        const savedImagePrompt = localStorage.getItem('editorImagePrompt');
        const savedTextPrompt = localStorage.getItem('editorTextPrompt');
        const savedTab = localStorage.getItem('editorActiveTab');
        const savedModel = localStorage.getItem('editorModel');

        if (savedImagePrompt || savedTextPrompt) {
          setPrompts({
            imageEdit: savedImagePrompt || '',
            textToImage: savedTextPrompt || ''
          });
        }
        if (savedTab) setActiveTab(savedTab);
        if (savedModel) setModel(savedModel);
      }
    } catch (err) {
      console.warn('加载编辑器状态失败:', err);
      // 尝试加载单独的字段
      try {
        const savedImagePrompt = localStorage.getItem('editorImagePrompt');
        const savedTextPrompt = localStorage.getItem('editorTextPrompt');
        if (savedImagePrompt || savedTextPrompt) {
          setPrompts({
            imageEdit: savedImagePrompt || '',
            textToImage: savedTextPrompt || ''
          });
        }
      } catch (e) {
        console.warn('加载提示词失败:', e);
      }
    }
  };

  // 错误消息翻译函数
  const translateError = (errorMessage) => {
    if (!errorMessage) return errorMessage;

    // 新 API 提供商相关错误
    if (errorMessage.includes('新API提供商认证失败') || errorMessage.includes('New API provider authentication failed')) {
      return t('editor.newApiProviderAuthFailed');
    }
    if (errorMessage.includes('新API提供商无权限') || errorMessage.includes('New API provider has no permission')) {
      return t('editor.newApiProviderNoPermission');
    }
    if (errorMessage.includes('新API提供商配额已用尽') || errorMessage.includes('New API provider quota exhausted')) {
      return t('editor.newApiProviderQuotaExhausted');
    }
    if (errorMessage.includes('新API提供商服务器错误') || errorMessage.includes('New API provider server error')) {
      return t('editor.newApiProviderServerError');
    }
    if (errorMessage.includes('新API提供商请求超时') || errorMessage.includes('New API provider request timeout')) {
      return t('editor.newApiProviderTimeout');
    }
    if (errorMessage.includes('新API提供商调用失败') || errorMessage.includes('New API provider call failed')) {
      return t('editor.newApiProviderFailed');
    }
    if (errorMessage.includes('新API提供商错误') || errorMessage.includes('New API provider error')) {
      return t('editor.newApiProviderError');
    }
    if (errorMessage.includes('API响应格式不正确') || errorMessage.includes('API response format is incorrect')) {
      return t('editor.newApiProviderInvalidResponse');
    }
    if (errorMessage.includes('API响应中未找到图像数据') || errorMessage.includes('No image data found in API response')) {
      return t('editor.newApiProviderNoImageData');
    }
    if (errorMessage.includes('API返回的图像数据格式无效') || errorMessage.includes('Invalid image data format returned by API')) {
      return t('editor.newApiProviderInvalidImageFormat');
    }

    // 如果无法匹配，返回原始错误消息
    return errorMessage;
  };

  const handleGenerate = async () => {
    // 防止重复调用
    if (isGeneratingRef.current || isGenerating) {
      console.warn('⚠️ 生成请求已在进行中，忽略重复调用');
      return;
    }

    if (activeTab === 'imageEdit') {
      if (!currentPrompt && referenceImages.length === 0) return;
    } else {
      if (!currentPrompt) return;
    }

    if (activeTab === 'imageEdit' && IMAGE_EDIT_BLOCKED_MODELS.includes(model)) {
      setError(t('editor.modelNotSupportedForImageEdit') || '当前模型不支持图像编辑，请选择其他模型或切换到文字生图模式。');
      isGeneratingRef.current = false;
      setIsGenerating(false);
      return;
    }

    // 设置生成状态
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      // 检查点数是否足够
      if (isLoggedIn) {
        const sufficient = await checkCreditsSufficient(currentCost);
        if (!sufficient) {
          const credits = await getMyCredits();
          setError(t('editor.insufficientCredits') || `点数不足！需要 ${currentCost} 点，当前只有 ${credits} 点。`);
          isGeneratingRef.current = false;
          setIsGenerating(false);
          return;
        }
      }

      const generationTime = new Date().toLocaleString();

      // 转换图片格式为 modelAPI 需要的格式
      const imagesForAPI = activeTab === 'imageEdit'
        ? referenceImages.map(img => {
            if (typeof img === 'object' && img !== null) {
              return img.base64 || img.blobUrl || img;
            }
            return img;
          })
        : [];

      const result = await modelAPI.generateImage(
        model,
        currentPrompt,
        imagesForAPI,
        {
          style: 'realistic',
          resolution: '800x600'
        }
      );

      if (result.success) {
        setGeneratedImages([...generatedImages, result.data.imageUrl]);

        // 记录到 Supabase generations 表并扣点
        const costToCharge = currentCost;
        let generationId = null;
        
        if (isLoggedIn) {
          try {
            console.log('开始扣点和保存记录，cost:', costToCharge);
            generationId = await createGenerationAndCharge({
              model,
              prompt: currentPrompt,
            resultUrl: result.data.imageUrl,
            durationMs: Math.round(parseFloat(result.data.generationTime) || 0),
              cost: costToCharge
            });
            console.log('扣点和保存成功，generationId:', generationId);
            rememberPromptForGeneration(generationId, currentPrompt);
            
            // 立即更新点数显示
            const newCredits = await getMyCredits();
            console.log('更新后的点数:', newCredits);
            setCurrentCredits(newCredits);
            
            // 清理旧的生成记录
            try {
              await enforceGenerationHistoryLimit(10);
            } catch (cleanupErr) {
              console.warn('清理旧的生成记录失败（可忽略）:', cleanupErr);
            }
          } catch (chargeErr) {
            console.error('❌ 记录生成与扣点失败:', chargeErr);
            setError(t('editor.error') + ': ' + (chargeErr.message || '扣点失败，请重试'));
            // 即使扣点失败，也保存到本地 history（但标记为未扣点）
            const newHistoryItem = {
              id: null,
              model,
              prompt: currentPrompt,
              referenceImagesCount: activeTab === 'imageEdit' ? referenceImages.length : 0,
              time: Date.now(),
              imageUrl: result.data.imageUrl,
              generationTime: result.data.generationTime,
              chargeFailed: true
            };
            setHistory((prev) => {
              const updated = [newHistoryItem, ...prev];
              return updated.slice(0, 10);
            });
          }
        } else {
          // 未登录用户：使用 localStorage 保存历史（最多 10 条）
          const newHistoryItem = {
            id: null,
            model,
            prompt: currentPrompt,
            referenceImagesCount: activeTab === 'imageEdit' ? referenceImages.length : 0,
            time: Date.now(),
            imageUrl: result.data.imageUrl,
            generationTime: result.data.generationTime
          };
          const updatedHistory = [newHistoryItem, ...history];
          const historyToSave = updatedHistory.slice(0, 10);
          setHistory(historyToSave);

          try {
            localStorage.setItem('generationHistory', JSON.stringify(historyToSave));
            console.log('未登录用户 history 已保存到 localStorage');
          } catch (storageError) {
            console.warn('⚠️ 保存历史记录失败（不影响图像生成）:', storageError);
          }
        }
      }
    } catch (err) {
      console.error('生成图像失败:', err);
      const errorMsg = err.message || t('common.loading');
      setError(t('editor.error') + ': ' + translateError(errorMsg));
    } finally {
      // 重置生成状态
      isGeneratingRef.current = false;
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const loadHistory = async () => {
      try {
        if (isLoggedIn) {
          console.log('开始加载登录用户的 history...');
          const rows = await getMyGenerationHistory(10);
          console.log('从数据库加载的 history 条数:', rows.length);
          const mapped = rows.map((row) => ({
            id: row.id,
            model: row.model,
            prompt: promptCache[row.id] || '',
            referenceImagesCount: 0,
            time: row.created_at ? new Date(row.created_at).getTime() : null,
            imageUrl: row.result_url,
            generationTime: row.duration_ms || 0
          }));
          setHistory(mapped);
          console.log('History 已加载到状态，条数:', mapped.length);
        } else {
          console.log('加载未登录用户的 history...');
          const savedHistory = localStorage.getItem('generationHistory');
          if (savedHistory) {
            try {
              const parsed = JSON.parse(savedHistory);
              setHistory(parsed);
              console.log('从 localStorage 加载的 history 条数:', parsed.length);
            } catch (e) {
              console.error('解析 localStorage history 失败:', e);
              setHistory([]);
            }
          } else {
            console.log('localStorage 中没有 history');
            setHistory([]);
          }
        }
      } catch (err) {
        console.error('加载历史记录失败:', err);
        setHistory([]);
      }
    };

    loadHistory();
  }, [isLoggedIn, user?.id, promptCache]);

  useEffect(() => {
    loadEditorState();
  }, [isLoggedIn]);

  // 当提示词改变时，自动保存（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      saveEditorState({
        prompts,
        referenceImages,
        activeTab,
        model
      });
    }, 500); // 防抖：500ms 后保存，避免频繁写入

    return () => clearTimeout(timer);
  }, [prompts, activeTab, model]);

  // 当图片数量改变时，立即保存（图片上传是异步的，需要立即保存）
  useEffect(() => {
    // 使用 setTimeout 确保状态已更新
    const timer = setTimeout(() => {
      saveEditorState({
        prompts,
        referenceImages,
        activeTab,
        model
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [referenceImages.length]);

  // 页面卸载或路由切换时保存状态
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveEditorState({
        prompts,
        referenceImages,
        activeTab,
        model
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时也保存一次
      handleBeforeUnload();
    };
  }, [prompts, referenceImages, activeTab, model]);

  // 定期更新点数（每30秒）
  useEffect(() => {
    if (!isLoggedIn) return;

    const updateCredits = async () => {
      try {
        const credits = await getMyCredits();
        setCurrentCredits(credits);
      } catch (err) {
        console.warn('更新点数失败:', err);
      }
    };

    // 立即更新一次
    updateCredits();

    // 每30秒更新一次
    const interval = setInterval(updateCredits, 30000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const downloadImage = (imageUrl) => {
    try {
      // 如果是 base64 data URL，需要特殊处理
      if (imageUrl.startsWith('data:')) {
        // 将 base64 转换为 Blob
        const base64Data = imageUrl.split(',')[1] || imageUrl.split(',')[0];
        const mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png';
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `generated-image-${new Date().getTime()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // HTTP URL，直接下载
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-image-${new Date().getTime()}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('下载图片失败:', error);
      // 如果下载失败，尝试在新窗口打开
      window.open(imageUrl, '_blank');
    }
  };

  const previewImageModal = (imageUrl) => {
    setPreviewImage(imageUrl);
  };

  const closePreview = () => {
    setPreviewImage(null);
  };

  const clearGeneratedImages = () => {
    setGeneratedImages([]);
  };

  // 历史记录相关函数
  const formatHistoryTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('editor.justNow');
    if (minutes < 60) return `${minutes}${t('editor.minutesAgo')}`;
    if (hours < 24) return `${hours}${t('editor.hoursAgo')}`;
    if (days < 7) return `${days}${t('editor.daysAgo')}`;
    return date.toLocaleDateString();
  };

  const useHistoryItem = (item) => {
    const targetTab = item.referenceImagesCount > 0 ? 'imageEdit' : 'textToImage';
    // 使用历史记录项：填充提示词和模型
    if (item.prompt) {
      updatePrompt(item.prompt, targetTab);
    }
    if (item.model) {
      setModel(item.model);
    }
    // 如果历史记录有图像，显示在生成结果中
    if (item.imageUrl && item.imageUrl !== '[Base64 Image Data]') {
      setGeneratedImages([item.imageUrl]);
    }
    // 切换到对应的标签页
    setActiveTab(targetTab);
    // 关闭历史记录模态框
    setShowHistory(false);
    // 滚动到顶部以便用户看到填充的内容
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryItem = (index) => {
    const newHistory = history.filter((_, i) => i !== index);
    setHistory(newHistory);
    try {
      localStorage.setItem('generationHistory', JSON.stringify(newHistory));
    } catch (e) {
      console.warn('删除历史记录失败:', e);
    }
  };

  const clearAllHistory = () => {
    if (window.confirm(t('editor.confirmClearHistory'))) {
      setHistory([]);
      try {
        localStorage.removeItem('generationHistory');
      } catch (e) {
        console.warn('清空历史记录失败:', e);
      }
    }
  };

  // 过滤历史记录
  const filteredHistory = history.filter(item => {
    const matchesSearch = !historySearchTerm ||
      (item.prompt && item.prompt.toLowerCase().includes(historySearchTerm.toLowerCase()));
    const matchesModel = historyFilterModel === 'all' ||
      (item.model && item.model.toLowerCase() === historyFilterModel.toLowerCase());
    return matchesSearch && matchesModel;
  });

  return (
    <div className="editor-page">
      <SEO
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        path={getLocalizedPath('/editor')}
      />

      <div className="editor-sidebar">
        <div className="sidebar-header">
          <h3>Nano Banana Studio</h3>
          <p>{t('editor.subtitle')}</p>
        </div>

        <div className="sidebar-section sidebar-stats">
          <div className="sidebar-section-heading">
            <div className="sidebar-label">{t('editor.modelSelection')}</div>
            <span className="sidebar-pill">
              {activeTab === 'imageEdit' ? t('editor.imageEdit') : t('editor.textToImage')}
            </span>
          </div>

          <div className="sidebar-stat-grid">
            <div className="sidebar-stat">
              <span className="stat-label">{t('editor.currentModel')}</span>
              <span className="stat-value">{model}</span>
            </div>
            <div className="sidebar-stat">
              <span className="stat-label">{t('editor.costDisplayTitle')}</span>
              <span className="stat-value">
                {currentCost || 0}
                <span className="stat-unit">pts</span>
              </span>
            </div>
            {isLoggedIn && (
              <div className="sidebar-stat">
                <span className="stat-label">{t('editor.currentCreditsLabel') || 'Credits'}</span>
                <span className="stat-value">
                  {currentCredits === null ? t('common.loading') : currentCredits}
                  <span className="stat-unit">pts</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">{t('editor.functionMode')}</div>
          <ul className="sidebar-links">
            <li>
              <button
                className={`sidebar-link ${activeTab === 'imageEdit' ? 'active' : ''}`}
                onClick={() => setActiveTab('imageEdit')}
              >
                <span className="sidebar-icon">🎨</span>
                <div>
                  <div>{t('editor.imageEdit')}</div>
                  <small>{t('editor.uploadReferenceAndPrompt')}</small>
                </div>
              </button>
            </li>
            <li>
              <button
                className={`sidebar-link ${activeTab === 'textToImage' ? 'active' : ''}`}
                onClick={() => setActiveTab('textToImage')}
              >
                <span className="sidebar-icon">✨</span>
                <div>
                  <div>{t('editor.textToImage')}</div>
                  <small>{t('editor.enterDescriptionToGenerate')}</small>
                </div>
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-section sidebar-history-preview">
          <div className="sidebar-label">{t('editor.history')}</div>
          {history.length > 0 ? (
            <>
              <p className="sidebar-history-text">
                {history[0]?.prompt || t('editor.noPrompt')}
              </p>
              <button className="sidebar-history-btn" onClick={() => setShowHistory(true)}>
                🕒 {t('editor.clickToUse')}
              </button>
            </>
          ) : (
            <p className="sidebar-history-empty">{t('editor.noHistory')}</p>
          )}
        </div>

      </div>

      {/* 主要编辑区域 */}
      <main className="editor-main">
        <h1 className="editor-title">
          {activeTab === 'imageEdit' ? t('editor.title') : t('editor.textToImageTitle')}
        </h1>
        <p className="editor-subtitle">
          {activeTab === 'imageEdit' ? t('editor.subtitle') : t('editor.textToImageSubtitle')}
        </p>

        <div className="editor-container">
          {/* 左侧输入面板 */}
          <div className="editor-panel input-panel">
            <div className="panel-header">
              <div className="panel-icon">✏️</div>
              <h3>{t('editor.promptInput')}</h3>
            </div>

            {/* AI模型选择 */}
            <div className="form-group">
              <label className="form-label">{t('editor.modelSelection')}</label>
              <select
                className="form-select"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="Nano Banana">Nano Banana</option>
                <option value="Nano Banana 2 (Pro)">Nano Banana 2 (Pro)</option>
                <option value="GPT-5 Image">GPT-5 Image</option>
                <option value="GPT-5 Image Mini">GPT-5 Image Mini</option>
                <option value="SeeDream-4" disabled={activeTab === 'imageEdit'}>SeeDream-4</option>
              </select>
              <p className="form-note">{t('editor.modelNote')}</p>

              {isImageEditModelBlocked && (
                <div className="warning-message">
                  ⚠️ {t('editor.modelNotSupportedForImageEdit') || '当前模型仅支持文字生图，请切换到文字模式或选择其他模型进行图生图。'}
                </div>
              )}

              {/* 积分消耗提示（不可交互） */}
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8f9fa', borderRadius: 8, lineHeight: 1.7 }}>
                {(function () {
                  const isTextToImage = activeTab === 'textToImage';
                  const items = isTextToImage
                    ? [
                      { name: 'Nano Banana', cost: 2 },
                      { name: 'Nano Banana 2 (Pro)', cost: 4 },
                      { name: 'GPT-5 Image', cost: 3 },
                      { name: 'GPT-5 Image Mini', cost: 2 },
                      { name: 'SeeDream-4', cost: 2 }
                    ]
                    : [
                      { name: 'Nano Banana', cost: 4 },
                      { name: 'Nano Banana 2 (Pro)', cost: 5 },
                      { name: 'GPT-5 Image', cost: 3 },
                      { name: 'GPT-5 Image Mini', cost: 3 },
                      { name: 'SeeDream-4', cost: 2 }
                    ];
                  return (
                    <div>
                      <div style={{ color: '#666', marginBottom: 4 }}>{t('editor.costDisplayTitle')}</div>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {items.map(it => (
                          <li key={`${it.name}-${it.cost}`} style={{ display: 'flex', gap: 8 }}>
                            <span style={{ color: '#555' }}>{t('editor.costConsume').replace('{points}', it.cost)}</span>
                            <span style={{ color: '#222' }}>{it.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* 编辑模式切换 */}
            <div className="form-group">
              <label className="form-label">{t('editor.functionMode')}</label>
              <div className="edit-modes">
                <button
                  className={`edit-mode-btn ${activeTab === 'imageEdit' ? 'active' : ''}`}
                  onClick={() => setActiveTab('imageEdit')}
                >
                  {t('editor.imageEdit')}
                </button>
                <button
                  className={`edit-mode-btn ${activeTab === 'textToImage' ? 'active' : ''}`}
                  onClick={() => setActiveTab('textToImage')}
                >
                  {t('editor.textToImage')}
                </button>
              </div>
            </div>

            {/* 参考图像上传 - 仅在图像编辑模式显示 */}
            {activeTab === 'imageEdit' && (
              <div className="form-group">
                <label className="form-label">
                  {t('editor.referenceImages')} {referenceImages.length}/9
                </label>
                <div className="image-upload-area">
                  {referenceImages.map((image, index) => {
                    // 兼容旧格式（字符串）和新格式（对象）
                    const imageSrc = typeof image === 'string'
                      ? image
                      : (image.blobUrl || image.base64 || image);
                    return (
                      <div key={index} className="uploaded-image">
                        <img src={imageSrc} alt={`${t('editor.referenceImages')} ${index + 1}`} />
                        <button
                          className="remove-image-btn"
                          onClick={() => removeImage(index)}
                          aria-label={t('editor.removeImage')}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  {referenceImages.length < 9 && (
                    <label className="upload-button">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="file-input"
                      />
                      <div className="upload-icon">+</div>
                      <div className="upload-text">{t('editor.addImage')}</div>
                      <div className="upload-limit">{t('editor.maxSize')}</div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 提示词输入 */}
            <div className="form-group">
              <label className="form-label">{t('editor.prompt')}</label>
              <textarea
                className="form-textarea"
                placeholder={activeTab === 'imageEdit' ? t('editor.promptPlaceholder') : t('editor.textToImagePlaceholder')}
                value={currentPrompt}
                onChange={(e) => updatePrompt(e.target.value)}
                rows={activeTab === 'imageEdit' ? 4 : 6}
              />
            </div>

            {/* 功能按钮 */}
            <button
              className={`btn btn-primary generate-btn ${isGenerating ? 'generating' : ''}`}
              onClick={handleGenerate}
              disabled={isGenerating ||
                isImageEditModelBlocked ||
                (activeTab === 'imageEdit' ?
                  (!currentPrompt && referenceImages.length === 0) :
                  !currentPrompt
                )
              }
            >
              {isGenerating ? t('editor.generating') : `${t('editor.generate')}${t('editor.costConsumeInButton').replace('{points}', currentCost)}`}
            </button>

            {/* 错误和警告信息显示 */}
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            {activeTab === 'imageEdit' && referenceImages.length === 0 && !isGenerating && !error && (
              <div className="warning-message">
                ⚠️ {t('editor.noImages')}
              </div>
            )}
            {activeTab === 'textToImage' && !currentPrompt && !isGenerating && !error && (
              <div className="warning-message">
                ⚠️ {t('editor.noPrompt')}
              </div>
            )}
          </div>

          {/* 右侧输出面板 */}
          <div className="editor-panel output-panel">
            <div className="panel-header">
              <div className="panel-icon">🖼️</div>
              <h3>
                {activeTab === 'imageEdit' ? t('editor.editingResults') : t('editor.generationResults')}
              </h3>
              {generatedImages.length > 0 && (
                <button
                  className="clear-btn"
                  onClick={clearGeneratedImages}
                >
                  {t('editor.clear')}
                </button>
              )}
            </div>

            {
              isGenerating ? (
                <div className="generating-container">
                  <div className="loading-spinner"></div>
                  <p className="generating-text">
                    {activeTab === 'imageEdit'
                      ? t('editor.editingWithModel', { model })
                      : t('editor.generatingWithModel', { model })}
                  </p>
                  <p className="generating-subtext">{t('editor.pleaseWait')}</p>
                </div>
              ) : generatedImages.length > 0 ? (
                <div className="output-gallery">
                  {generatedImages.map((imageUrl, index) => (
                    <div key={index} className="generated-image-container">
                      <img
                        src={imageUrl}
                        alt={`生成的图像 ${index + 1}`}
                        className="generated-image"
                      />
                      <div className="image-actions">
                        <button
                          className="action-btn"
                          onClick={() => downloadImage(imageUrl)}
                          title={t('editor.downloadImage')}
                        >
                          ⬇️
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => previewImageModal(imageUrl)}
                          title={t('common.view')}
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="output-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p className="placeholder-text">
                    {activeTab === 'imageEdit' ? t('editor.prepareEditImage') : t('editor.prepareGenerateImage')}
                  </p>
                  <p className="placeholder-subtext">
                    {activeTab === 'imageEdit' ? t('editor.uploadReferenceAndPrompt') : t('editor.enterDescriptionToGenerate')}
                  </p>
                </div>
              )
            }
          </div>
        </div>
      </main>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={closePreview}>
          <div className="preview-content" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <div>
                <p>{t('common.view')}</p>
                <small>{model} · {activeTab === 'imageEdit' ? t('editor.imageEdit') : t('editor.textToImage')}</small>
              </div>
              <button className="close-preview-btn" onClick={closePreview} aria-label="close preview">×</button>
            </div>
            <div className="preview-image-wrapper">
              <img src={previewImage} alt="Preview" />
            </div>
            <div className="preview-actions">
              <button onClick={() => downloadImage(previewImage)}>{t('editor.downloadImage')}</button>
              <button onClick={() => window.open(previewImage, '_blank')}>{t('common.view')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 历史记录侧边栏/抽屉 */}
      <button
        className="history-toggle-btn"
        onClick={() => setShowHistory(!showHistory)}
        title={t('editor.history')}
      >
        🕒 {history.length > 0 && <span className="history-badge">({history.length}/10)</span>}
      </button>

      {showHistory && (
        <div className="history-drawer">
          <div className="history-header">
            <h3>{t('editor.history')}</h3>
            <button className="close-history-btn" onClick={() => setShowHistory(false)}>×</button>
          </div>

          <div className="history-content">
            {/* 搜索和筛选 */}
            <div className="history-filters">
              <input
                type="text"
                placeholder={t('editor.searchHistory')}
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="history-search"
              />
              <select
                value={historyFilterModel}
                onChange={(e) => setHistoryFilterModel(e.target.value)}
                className="history-filter"
              >
                <option value="all">{t('editor.allModels')}</option>
                <option value="Nano Banana">Nano Banana</option>
                <option value="Nano Banana 2 (Pro)">Nano Banana 2 (Pro)</option>
                <option value="GPT-5 Image">GPT-5 Image</option>
                <option value="GPT-5 Image Mini">GPT-5 Image Mini</option>
                <option value="SeeDream-4">SeeDream-4</option>
              </select>
              {history.length > 0 && (
                <button
                  className="history-clear-btn"
                  onClick={clearAllHistory}
                >
                  {t('editor.clearAll')}
                </button>
              )}
            </div>

            {/* 历史记录列表 */}
            <div className="history-list">
              {filteredHistory.length === 0 ? (
                <div className="history-empty">
                  <div className="history-empty-icon">📭</div>
                  <p>{history.length === 0 ? t('editor.noHistory') : t('editor.noMatchingHistory')}</p>
                </div>
              ) : (
                filteredHistory.map((item, index) => {
                  const actualIndex = history.findIndex(h => h === item);
                  return (
                    <div key={actualIndex} className="history-item">
                      <div
                        className="history-item-image"
                        onClick={() => useHistoryItem(item)}
                      >
                        {item.imageUrl && item.imageUrl !== '[Base64 Image Data]' ? (
                          <img
                            src={item.imageUrl}
                            alt={item.prompt || t('editor.generatedImage')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="history-item-placeholder" style={{ display: item.imageUrl && item.imageUrl !== '[Base64 Image Data]' ? 'none' : 'flex' }}>
                          🖼️
                        </div>
                        <div className="history-item-overlay">
                          <span className="history-item-action">{t('editor.clickToUse')}</span>
                        </div>
                      </div>
                      <div className="history-item-info">
                        <div className="history-item-header">
                          <span className="history-item-model">{item.model || 'Unknown'}</span>
                          <button
                            className="history-item-delete"
                            onClick={() => deleteHistoryItem(actualIndex)}
                            title={t('editor.delete')}
                          >
                            🗑️
                          </button>
                        </div>
                        <p className="history-item-prompt" title={item.prompt}>
                          {item.prompt || t('editor.noPrompt')}
                        </p>
                        <div className="history-item-meta">
                          <span className="history-item-time">
                            {formatHistoryTime(item.time)}
                          </span>
                          {item.generationTime && (
                            <span className="history-item-duration">
                              {item.generationTime}s
                            </span>
                          )}
                          {item.referenceImagesCount > 0 && (
                            <span className="history-item-refs">
                              📎 {item.referenceImagesCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Editor