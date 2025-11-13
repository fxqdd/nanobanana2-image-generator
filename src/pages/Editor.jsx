import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import SEO from '../components/SEO'
import '../styles/Editor.css'
import modelAPI from '../utils/modelAPI'
import { createGenerationAndCharge } from '../services/db'

function Editor() {
  const { t, getLocalizedPath } = useLanguage()
  const [activeTab, setActiveTab] = useState('imageEdit')
  const [model, setModel] = useState('Nano Banana')
  const [referenceImages, setReferenceImages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [generatedImages, setGeneratedImages] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  
  // 提示词优化相关状态
  const [optimizedPrompt, setOptimizedPrompt] = useState('')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState(null)
  const [optimizationError, setOptimizationError] = useState(null)
  
  const seoData = t('seo.editor')

  const computeCost = () => {
    const isTextToImage = activeTab === 'textToImage';
    const m = (model || '').toLowerCase();
    if (isTextToImage) {
      if (m === 'nano banana') return 2;
      if (m === 'gpt-5 image mini') return 2;
      if (m === 'gpt-5 image') return 3;
      if (m === 'seedream-4' || m === 'seedream') return 2;
    } else {
      // 图生图（imageEdit）
      if (m === 'nano banana') return 4;
      if (m === 'gpt-5 image' || m === 'gpt-5 image mini') return 3;
      if (m === 'seedream-4' || m === 'seedream') return 2;
    }
    return 0;
  };
  const currentCost = computeCost();

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files.length > 0 && referenceImages.length < 9) {
      const newImage = URL.createObjectURL(e.target.files[0])
      setReferenceImages([...referenceImages, newImage])
      e.target.value = ''
    }
  }

  const removeImage = (index) => {
    const newImages = [...referenceImages]
    newImages.splice(index, 1)
    setReferenceImages(newImages)
  }

  const handleGenerate = async () => {
    if (!prompt && referenceImages.length === 0) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const generationTime = new Date().toLocaleString();
      
      // 如果当前有优化后的提示词，优先使用优化后的提示词
      // 注意：只有在用户主动优化过提示词时才使用，不进行自动优化
      let finalPrompt = prompt;
      if (optimizedPrompt && optimizedPrompt.trim() && optimizedPrompt !== prompt) {
        console.log('✨ 使用优化后的提示词进行图像生成');
        console.log('原始提示词:', prompt);
        console.log('优化提示词:', optimizedPrompt);
        finalPrompt = optimizedPrompt;
      }
      // 移除了自动优化逻辑，避免在选择非 Nano Banana 模型时调用 Gemini API
      
      const result = await modelAPI.generateImage(
        model,
        finalPrompt, // 使用优化后的提示词
        referenceImages,
        {
          style: 'realistic',
          resolution: '800x600'
        }
      );
      
      if (result.success) {
        setGeneratedImages([...generatedImages, result.data.imageUrl]);
        
        const newHistoryItem = {
          model,
          prompt: finalPrompt, // 保存实际使用的提示词
          originalPrompt: prompt, // 保存原始提示词
          referenceImagesCount: referenceImages.length,
          time: generationTime,
          imageUrl: result.data.imageUrl,
          generationTime: result.data.generationTime
        };
        setHistory([newHistoryItem, ...history]);
        
        const updatedHistory = [newHistoryItem, ...history];
        localStorage.setItem('generationHistory', JSON.stringify(updatedHistory.slice(0, 50)));

        // 计算扣点
        const isTextToImage = activeTab === 'textToImage';
        const m = model.toLowerCase();
        let cost = 0;
        if (isTextToImage) {
          if (m === 'nano banana') cost = 2;
          else if (m === 'gpt-5 image mini') cost = 2;
          else if (m === 'gpt-5 image') cost = 3;
          else if (m === 'seedream-4' || m === 'seedream') cost = 2;
        } else {
          // 图生图（imageEdit）
          if (m === 'nano banana') cost = 4;
          else if (m === 'gpt-5 image' || m === 'gpt-5 image mini') cost = 3;
          else if (m === 'seedream-4' || m === 'seedream') cost = 2;
        }

        try {
          await createGenerationAndCharge({
            model,
            prompt: finalPrompt,
            resultUrl: result.data.imageUrl,
            durationMs: result.data.generationTime || 0,
            cost
          });
        } catch (chargeErr) {
          console.warn('记录生成与扣点失败（不中断前端展示）:', chargeErr);
        }
      }
    } catch (err) {
      console.error('生成图像失败:', err);
      setError(t('editor.error') + ': ' + (err.message || t('common.loading')));
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    const savedHistory = localStorage.getItem('generationHistory');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('加载历史记录失败:', e);
      }
    }
  }, []);

  const downloadImage = (imageUrl) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearGeneratedImages = () => {
    setGeneratedImages([]);
  };

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
              <h3>Nano Banana</h3>
              <p>AI Generator</p>
            </div>
        
        <nav className="sidebar-nav">
          <ul className="sidebar-links">
            <li>
              <button 
                className={`sidebar-link ${activeTab === 'imageEdit' ? 'active' : ''}`}
                onClick={() => setActiveTab('imageEdit')}
              >
                🖼️ {t('editor.imageEdit')}
              </button>
            </li>
            <li>
              <button 
                className={`sidebar-link ${activeTab === 'textToImage' ? 'active' : ''}`}
                onClick={() => setActiveTab('textToImage')}
              >
                📝 {t('editor.textToImage')}
              </button>
            </li>
            <li>
              <button 
                className={`sidebar-link ${activeTab === 'promptOptimize' ? 'active' : ''}`}
                onClick={() => setActiveTab('promptOptimize')}
              >
                ✨ {t('editor.promptOptimize')}
              </button>
            </li>
            <li>
              <button 
                className="sidebar-link"
                onClick={() => alert(t('editor.historyFeature'))}
              >
                📋 {t('editor.history')}
              </button>
            </li>
          </ul>
        </nav>
        
        <div className="model-info">
          <h4>{t('editor.currentModel')}</h4>
          <p className="model-name">{model}</p>
          <p className="model-status">
            {model.toLowerCase().includes('nano banana') ? 
              t('editor.highPerformance') : model.toLowerCase().includes('gemini') ?
              t('editor.multimodal') : t('editor.artistic')}
          </p>
        </div>
      </div>

      {/* 主要编辑区域 */}
      <main className="editor-main">
        <h1 className="editor-title">
          {activeTab === 'imageEdit' ? t('editor.title') : 
           activeTab === 'textToImage' ? t('editor.textToImageTitle') : 
           t('editor.optimizeTitle')}
        </h1>
        <p className="editor-subtitle">
          {activeTab === 'imageEdit' ? t('editor.subtitle') : 
           activeTab === 'textToImage' ? t('editor.textToImageSubtitle') : 
           t('editor.optimizeSubtitle')}
        </p>

        <div className="editor-container">
          {/* 左侧输入面板 */}
          <div className="editor-panel input-panel">
            <div className="panel-header">
              <div className="panel-icon">✏️</div>
              <h3>{t('editor.promptInput')}</h3>
            </div>

            {/* AI模型选择 */}
            {activeTab !== 'promptOptimize' && (
              <div className="form-group">
                <label className="form-label">{t('editor.modelSelection')}</label>
                <select 
                  className="form-select" 
                  value={model} 
                  onChange={(e) => setModel(e.target.value)}
                >
                  <option value="Nano Banana">Nano Banana</option>
                  <option value="GPT-5 Image">GPT-5 Image</option>
                  <option value="GPT-5 Image Mini">GPT-5 Image Mini</option>
                  <option value="SeeDream-4">SeeDream-4</option>
                </select>
                <p className="form-note">{t('editor.modelNote')}</p>
                
                {/* 积分消耗提示（不可交互） */}
                <div style={{ marginTop: 8, padding: '8px 10px', background: '#f8f9fa', borderRadius: 8, lineHeight: 1.7 }}>
                  {(function(){
                    const isTextToImage = activeTab === 'textToImage';
                    const items = isTextToImage
                      ? [
                          { name: 'Nano Banana', cost: 2 },
                          { name: 'GPT-5 Image', cost: 3 },
                          { name: 'GPT-5 Image Mini', cost: 2 },
                          { name: 'SeeDream-4', cost: 2 }
                        ]
                      : [
                          { name: 'Nano Banana', cost: 4 },
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
            )}

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
                <button 
                  className={`edit-mode-btn ${activeTab === 'promptOptimize' ? 'active' : ''}`}
                  onClick={() => setActiveTab('promptOptimize')}
                >
                  {t('editor.promptOptimize')}
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
                  {referenceImages.map((image, index) => (
                    <div key={index} className="uploaded-image">
                      <img src={image} alt={`${t('editor.referenceImages')} ${index + 1}`} />
                      <button 
                        className="remove-image-btn" 
                        onClick={() => removeImage(index)}
                        aria-label={t('editor.removeImage')}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
              <label className="form-label">{activeTab === 'promptOptimize' ? t('editor.originalPrompt') : t('editor.prompt')}</label>
              <textarea
                className="form-textarea"
                placeholder={activeTab === 'imageEdit' ? t('editor.promptPlaceholder') : 
                           activeTab === 'textToImage' ? t('editor.textToImagePlaceholder') : 
                           t('editor.optimizePlaceholder')}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={activeTab === 'promptOptimize' ? 3 : activeTab === 'imageEdit' ? 4 : 6}
              />
            </div>

            {/* 功能按钮 */}
            {activeTab === 'promptOptimize' ? (
              <button 
                className={`btn btn-primary generate-btn ${isOptimizing ? 'generating' : ''}`}
                onClick={async () => {
                  if (!prompt) return;
                  
                  setIsOptimizing(true);
                  setOptimizationError(null);
                  
                  try {
                    const result = await modelAPI.optimizePrompt(prompt);
                    
                    if (result.success) {
                      setOptimizedPrompt(result.data.optimizedPrompt);
                      setOptimizationResult(result.data);
                    }
                  } catch (err) {
                    console.error('提示词优化失败:', err);
                    setOptimizationError(t('editor.optimizeError'));
                  } finally {
                    setIsOptimizing(false);
                  }
                }}
                disabled={isOptimizing || !prompt}
              >
                {isOptimizing ? t('editor.optimizing') : t('editor.optimize')}
              </button>
            ) : (
              <button 
                className={`btn btn-primary generate-btn ${isGenerating ? 'generating' : ''}`}
                onClick={handleGenerate}
                disabled={isGenerating || 
                  (activeTab === 'imageEdit' ? 
                    (!prompt && referenceImages.length === 0) : 
                    !prompt
                  )
                }
              >
                {isGenerating ? t('editor.generating') : `${t('editor.generate')}${t('editor.costConsumeInButton').replace('{points}', currentCost)}`}
              </button>
            )}
            
            {/* 错误和警告信息显示 */}
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            {optimizationError && (
              <div className="error-message">
                ❌ {optimizationError}
              </div>
            )}
            {activeTab === 'imageEdit' && referenceImages.length === 0 && !isGenerating && !error && (
              <div className="warning-message">
                ⚠️ {t('editor.noImages')}
              </div>
            )}
            {((activeTab === 'textToImage' || activeTab === 'promptOptimize') && 
              !prompt && 
              !isGenerating && 
              !isOptimizing && 
              !error && 
              !optimizationError) && (
              <div className="warning-message">
                ⚠️ {t('editor.noPrompt')}
              </div>
            )}
            
            {/* 提示词优化结果展示 */}
            {activeTab === 'promptOptimize' && optimizationResult && (
              <div className="optimization-result">
                <div className="result-header">
                  <h4>
                    {t('editor.optimizationResult')} 
                    {optimizationResult.parameters?.isLocalOptimization ? (
                      <span className="optimization-badge local">{t('editor.localOptimization')}</span>
                    ) : (
                      <span className="optimization-badge ai">{t('editor.aiOptimization')}</span>
                    )}
                  </h4>
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(optimizationResult.optimizedPrompt);
                      alert(t('editor.copiedToClipboard'));
                    }}
                  >
                    📋 {t('editor.copy')}
                  </button>
                  <button 
                    className="use-btn"
                    onClick={() => {
                      setActiveTab('textToImage');
                      setPrompt(optimizationResult.optimizedPrompt);
                    }}
                  >
                    🚀 {t('editor.useNow')}
                  </button>
                </div>
                <div className="result-content">
                  <div className="optimized-prompt">
                    <strong>{t('editor.optimizedPrompt')}</strong>
                    <p>{optimizationResult.optimizedPrompt}</p>
                  </div>
                  <div className="optimization-notes">
                    <strong>{t('editor.optimizationNotes')}</strong>
                    <p>{optimizationResult.optimizationNotes}</p>
                  </div>
                  {optimizationResult.parameters?.isLocalOptimization && (
                    <div className="optimization-info" style={{
                      padding: '12px',
                      marginTop: '12px',
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '6px',
                      color: '#856404'
                    }}>
                      <strong>⚠️ {t('editor.usingLocalEngine')}</strong>
                      <p style={{margin: '8px 0 0 0', fontSize: '0.9em'}}>
                        {optimizationResult.apiError?.status === 429 
                          ? t('editor.apiQuotaExhausted')
                          : t('editor.apiUnavailable')}
                      </p>
                      {optimizationResult.apiError?.troubleshooting?.suggestions && (
                        <ul style={{margin: '8px 0 0 20px', fontSize: '0.85em'}}>
                          {optimizationResult.apiError.troubleshooting.suggestions.slice(0, 3).map((suggestion, idx) => (
                            <li key={idx}>{suggestion.replace(/^\d+\.\s*/, '')}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧输出面板 */}
          <div className="editor-panel output-panel">
            <div className="panel-header">
              <div className="panel-icon">
                {activeTab === 'promptOptimize' ? '✨' : '🖼️'}
              </div>
              <h3>
                {activeTab === 'imageEdit' ? t('editor.editingResults') : 
                 activeTab === 'textToImage' ? t('editor.generationResults') : 
                 t('editor.optimizationHint')}
              </h3>
              {generatedImages.length > 0 && activeTab !== 'promptOptimize' && (
                <button 
                  className="clear-btn"
                  onClick={clearGeneratedImages}
                >
                  {t('editor.clear')}
                </button>
              )}
            </div>

            {activeTab === 'promptOptimize' ? (
              isOptimizing ? (
                <div className="generating-container">
                  <div className="loading-spinner"></div>
                  <p className="generating-text">{t('editor.optimizingWithGemini')}</p>
                  <p className="generating-subtext">{t('editor.pleaseWait')}</p>
                </div>
              ) : optimizationResult ? (
                <div className="optimization-visual-result">
                  <div className="result-card">
                    <div className="result-section">
                      <h4>📝 原始提示词</h4>
                      <p className="original-prompt">{optimizationResult.originalPrompt}</p>
                    </div>
                    <div className="result-divider">→</div>
                    <div className="result-section">
                      <h4>✨ 优化后提示词</h4>
                      <p className="optimized-prompt-text">{optimizationResult.optimizedPrompt}</p>
                    </div>
                  </div>
                  <div className="result-stats">
                    <div className="stat-item">
                      <span className="stat-label">优化时间</span>
                      <span className="stat-value">{optimizationResult.generationTime}s</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">模型</span>
                      <span className="stat-value">
                        {optimizationResult.model}
                        {optimizationResult.parameters?.isLocalOptimization && (
                          <span style={{
                            color: '#ff6b35', 
                            fontSize: '0.8em', 
                            marginLeft: '5px',
                            padding: '2px 6px',
                            backgroundColor: '#fff3cd',
                            borderRadius: '4px'
                          }} title="本地优化（API不可用）">
                            🔧 本地
                          </span>
                        )}
                      </span>
                    </div>
                    {optimizationResult.parameters?.isLocalOptimization && optimizationResult.apiError && (
                      <div className="stat-item" style={{
                        gridColumn: '1 / -1',
                        padding: '10px',
                        marginTop: '10px',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        borderRadius: '6px',
                        fontSize: '0.85em'
                      }}>
                        <strong>⚠️ 使用本地优化</strong>
                        <p style={{margin: '5px 0 0 0'}}>
                          {optimizationResult.apiError.status === 429 
                            ? 'Gemini API配额已用尽，已自动切换到本地优化方案。'
                            : 'Gemini API服务暂时不可用，已自动切换到本地优化方案。'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="output-placeholder">
                  <div className="placeholder-icon">✨</div>
                  <p className="placeholder-text">准备优化提示词</p>
                  <p className="placeholder-subtext">输入简短提示词，我们将自动扩展为详细的图像生成指令</p>
                  <div className="placeholder-tips">
                    <h5>💡 优化效果示例：</h5>
                    <p><strong>原始：</strong>"日落山脉"</p>
                    <p><strong>优化后：</strong>包含光线、色彩、构图等详细描述</p>
                  </div>
                </div>
              )
            ) : (
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
                          onClick={() => window.open(imageUrl, '_blank')}
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
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Editor