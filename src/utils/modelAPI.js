import axios from 'axios';

// 创建模型API服务类
class ModelAPIService {
  constructor() {
    // 这里可以根据环境变量配置API地址
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://api.nanobanana.com';
    this.timeout = 60000; // 60秒超时
    // 强制使用环境变量中的 API key，如果没有配置则报错
    this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!this.geminiApiKey) {
      console.error('❌ 错误: VITE_GEMINI_API_KEY 环境变量未配置！');
      console.error('请在项目根目录创建 .env.local 文件，并添加:');
      console.error('VITE_GEMINI_API_KEY=你的API密钥');
      console.error('然后重启开发服务器');
    }
    
    // 火山引擎 API 配置
    this.volcanoApiKey = import.meta.env.VITE_VOLCANO_API_KEY || 'f16cd787-3581-461d-82fc-8335ae8ef99c';
    this.volcanoBaseURL = 'https://ark.cn-beijing.volces.com/api/v3';
    this.volcanoModelId = 'doubao-seedream-4-0-250828';
    
    // Doubao-seed-1.6 配置（用于提示词优化）
    this.doubaoSeedApiKey = import.meta.env.VITE_DOUBAO_SEED_API_KEY || this.volcanoApiKey;
    this.doubaoSeedModelId = import.meta.env.VITE_DOUBAO_SEED_MODEL_ID || 'doubao-seed-1-6-251015';
    
    // OpenRouter 配置（用于 NanoBanana 与 GPT-5 系列）
    this.openRouterBase = 'https://openrouter.ai/api/v1';
    this.openRouterApiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.siteUrl = import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    this.siteName = import.meta.env.VITE_SITE_NAME || 'Nano Banana 2';
    this.orModelNanoBanana = import.meta.env.VITE_OPENROUTER_MODEL_NANOBANANA || '';
    this.orModelGpt5Image = import.meta.env.VITE_OPENROUTER_MODEL_GPT5_IMAGE || '';
    this.orModelGpt5ImageMini = import.meta.env.VITE_OPENROUTER_MODEL_GPT5_IMAGE_MINI || '';
    
    // 默认禁用代理模式，直接使用 API 密钥
    // 只有在明确设置 VITE_USE_PROXY=true 时才启用代理
    this.isProxyEnabled = import.meta.env.VITE_USE_PROXY === 'true' && !!import.meta.env.VITE_API_BASE_URL;
    
    // 调试信息：输出当前配置（隐藏完整密钥，只显示前后几位）
    const apiKeyDisplay = this.geminiApiKey 
      ? `${this.geminiApiKey.substring(0, 8)}...${this.geminiApiKey.substring(this.geminiApiKey.length - 4)}`
      : '未配置';
    
    console.log('🔧 API配置信息:', {
      hasApiKey: !!this.geminiApiKey,
      apiKeyDisplay: apiKeyDisplay,
      apiKeyLength: this.geminiApiKey?.length || 0,
      isProxyEnabled: this.isProxyEnabled,
      baseURL: this.baseURL,
      useProxyEnv: import.meta.env.VITE_USE_PROXY,
      hasBaseURLEnv: !!import.meta.env.VITE_API_BASE_URL,
      envViteGeminiApiKey: import.meta.env.VITE_GEMINI_API_KEY ? '已设置' : '未设置'
    });
    
    // 提示词优化系统提示词
    this.promptOptimizationSystemPrompt = `你是一个专业的提示词优化助手，专门为AI图像生成模型优化用户的文本描述。

请将用户提供的简短提示词扩展和优化为更详细、更有表现力的描述，确保包含以下要素：

1. 主题与内容：明确描述图像的主要内容和主题
2. 视觉风格：指定艺术风格、光照、色彩方案和氛围
3. 细节描述：添加丰富的细节，如纹理、材质、背景元素等
4. 构图指导：提供关于视角、比例、构图的建议
5. 情绪表达：描述图像应传达的情绪或氛围

优化后的提示词应该详细但简洁，适合AI图像生成模型理解。

请保留原始提示词的核心主题，同时显著增强其描述性和细节丰富度。

优化输出格式：
- 原始提示词：[用户原始提示词]
- 优化提示词：[详细优化后的提示词]
- 优化说明：[简述主要添加的内容和改进]`;
  }

  // 基础请求配置
  getInstance() {
    return axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  // 图像转Base64 (用于本地测试和开发)
  async imageToBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(',')[1]; // 移除data:image/*;base64,前缀
          resolve(base64data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('图像转换失败:', error);
      throw error;
    }
  }

  // 通过 OpenRouter 调用图像生成（使用 chat/completions 端点）
  async callOpenRouterImage(modelId, prompt, referenceImages = [], options = {}) {
    // 是否使用 Cloudflare Pages Functions 代理
    const useCfProxy = true; // 默认启用，通过 /api/openrouter 代理，避免在前端暴露密钥
    
    if (!modelId || modelId.trim() === '') {
      console.error('❌ OpenRouter 模型ID未配置');
      console.error('请在 .env.local 文件中设置相应的模型ID:');
      console.error('VITE_OPENROUTER_MODEL_NANOBANANA=google/gemini-2.5-flash-image');
      throw new Error('OpenRouter 模型ID未配置。请设置相应的 VITE_OPENROUTER_MODEL_* 变量');
    }
    
    // 仅在直连模式下检查密钥
    if (!useCfProxy) {
      if (!this.openRouterApiKey || this.openRouterApiKey.trim() === '') {
        console.error('❌ OpenRouter API Key 未配置');
        throw new Error('OpenRouter API Key 未配置。生产环境请改用 Cloudflare Pages Functions 代理，或在 .env.local 中设置 VITE_OPENROUTER_API_KEY。');
      }
      if (!this.openRouterApiKey.startsWith('sk-or-v1-') && !this.openRouterApiKey.startsWith('sk-or-')) {
        console.warn('⚠️ OpenRouter API Key 格式可能不正确');
      }
    }
    
    const headers = useCfProxy
      ? {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      : {
          'Authorization': `Bearer ${this.openRouterApiKey}`,
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
    
    console.log('🔑 OpenRouter 认证信息:', {
      mode: useCfProxy ? 'cf_pages_proxy' : 'direct',
      hasApiKey: useCfProxy ? 'hidden(by proxy)' : !!this.openRouterApiKey,
      apiKeyPrefix: useCfProxy ? 'via-proxy' : (this.openRouterApiKey.substring(0, 15) + '...'),
      apiKeyLength: useCfProxy ? 'via-proxy' : this.openRouterApiKey.length,
      modelId: modelId,
      siteUrl: this.siteUrl,
      siteName: this.siteName
    });
    
    const startTime = Date.now();
    
    // 构建消息数组
    const messages = [];
    
    // 如果有参考图像（图生图模式），添加图像到消息中
    if (referenceImages.length > 0) {
      const imageParts = [];
      
      for (const img of referenceImages) {
        let imageData = '';
        let mimeType = 'image/jpeg';
        
        try {
          // 处理不同类型的图像URL
          if (img.startsWith('data:image')) {
            // Data URL格式: data:image/png;base64,xxx
            const parts = img.split(',');
            imageData = parts[1];
            const mimeMatch = img.match(/data:image\/([^;]+)/);
            if (mimeMatch) {
              mimeType = `image/${mimeMatch[1]}`;
            }
          } else if (img.startsWith('blob:')) {
            // Blob URL，需要先转换为Base64
            imageData = await this.imageToBase64(img);
            try {
              const response = await fetch(img);
              const blob = await response.blob();
              mimeType = blob.type || 'image/png';
            } catch {
              mimeType = 'image/png';
            }
          } else if (typeof img === 'string' && img.length > 100) {
            // 可能是Base64字符串（没有前缀）
            imageData = img;
            mimeType = 'image/png';
          }
          
          if (imageData) {
            imageParts.push({
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageData}`
              }
            });
          }
        } catch (imgError) {
          console.warn('处理参考图像失败:', imgError);
        }
      }
      
      // 添加图像和文本提示词
      if (imageParts.length > 0) {
        messages.push({
          role: 'user',
          content: [
            ...imageParts,
            {
              type: 'text',
              text: `基于提供的参考图像，生成以下描述的图像：${prompt}`
            }
          ]
        });
      } else {
        messages.push({
          role: 'user',
          content: prompt
        });
      }
    } else {
      // 纯文本提示词 - 对于 Gemini 2.5 Flash Image，需要使用明确的图像生成指令
      // 注意：Gemini 2.5 Flash Image 需要明确的图像生成请求
      const imagePrompt = modelId.includes('gemini-2.5-flash-image') 
        ? `Generate an image of: ${prompt}. Return only the image data, no text description.`
        : `生成以下描述的图像：${prompt}`;
      
      messages.push({
        role: 'user',
        content: imagePrompt
      });
    }
    
    // 构建请求体 - 使用 chat/completions 端点
    const body = {
      model: modelId,
      messages: messages,
      max_tokens: 4096
    };
    
    // 对于 Gemini 2.5 Flash Image，可能需要特殊配置
    if (modelId.includes('gemini-2.5-flash-image')) {
      // 尝试添加额外的参数来确保返回图像
      body.temperature = 0.7;
      // 某些模型可能需要 response_format
      // 但 Gemini 2.5 Flash Image 可能不支持，所以先不设置
    }
    
    // 添加图像配置（如果模型支持）
    if (options.aspectRatio || options.size) {
      body.image_config = {
        aspect_ratio: options.aspectRatio || this.parseSizeToAspectRatio(options.size)
      };
    }
    
    console.log('📤 OpenRouter 请求:', {
      model: modelId,
      messagesCount: messages.length,
      hasImages: referenceImages.length > 0,
      bodyKeys: Object.keys(body)
    });
    
    try {
      const url = useCfProxy ? '/api/openrouter' : `${this.openRouterBase}/chat/completions`;
      const payload = useCfProxy ? { siteUrl: this.siteUrl, siteName: this.siteName, payload: body } : body;
      const resp = await axios.post(url, payload, { headers, timeout: 120000 });
      
      console.log('📥 OpenRouter 响应:', {
        status: resp.status,
        dataKeys: Object.keys(resp.data || {}),
        hasChoices: !!resp.data?.choices,
        choicesCount: resp.data?.choices?.length || 0
      });
      
      // 详细记录响应结构以便调试
      console.log('🔍 完整响应结构:', resp.data);
      
      if (resp.data?.choices?.[0]?.message) {
        const msg = resp.data.choices[0].message;
        console.log('📋 Message 结构:', {
          contentType: typeof msg.content,
          isArray: Array.isArray(msg.content),
          contentLength: typeof msg.content === 'string' ? msg.content.length : (Array.isArray(msg.content) ? msg.content.length : 'N/A'),
          contentPreview: typeof msg.content === 'string' 
            ? msg.content.substring(0, 200) 
            : (Array.isArray(msg.content) 
              ? JSON.stringify(msg.content.map(p => ({ 
                  type: p.type, 
                  hasUrl: !!p.image_url?.url, 
                  hasText: !!p.text,
                  textPreview: p.text ? p.text.substring(0, 100) : null,
                  urlPreview: p.image_url?.url ? p.image_url.url.substring(0, 100) : null
                })), null, 2)
              : 'N/A'),
          fullContent: msg.content // 输出完整内容以便在控制台展开查看
        });
        
        // 如果是数组，详细记录每个部分
        if (Array.isArray(msg.content)) {
          msg.content.forEach((part, index) => {
            console.log(`📦 Content Part ${index}:`, {
              type: part.type,
              keys: Object.keys(part),
              hasImageUrl: !!part.image_url,
              hasText: !!part.text,
              textLength: part.text?.length,
              imageUrlLength: part.image_url?.url?.length,
              textPreview: part.text ? part.text.substring(0, 200) : null,
              imageUrlPreview: part.image_url?.url ? part.image_url.url.substring(0, 200) : null
            });
          });
        }
      }
      
      // 解析响应 - 检查是否是 GPT-5 Image 或其他特殊格式
      const isGpt5Image = modelId.includes('gpt-5') || modelId.includes('gpt5');
      
      // 记录完整的响应结构以便调试
      if (isGpt5Image) {
        console.log('🎯 GPT-5 Image 模型检测到，检查特殊响应格式...');
        console.log('📋 响应顶层字段:', Object.keys(resp.data || {}));
        if (resp.data?.reasoning_details) {
          console.log('⚠️ 检测到 reasoning_details 字段（推理数据，可能包含加密内容）');
          console.log('reasoning_details 类型:', Array.isArray(resp.data.reasoning_details) ? 'array' : typeof resp.data.reasoning_details);
        }
      }
      
      const choice = resp.data?.choices?.[0];
      if (!choice) {
        console.error('OpenRouter 响应结构:', JSON.stringify(resp.data, null, 2));
        throw new Error('OpenRouter 返回数据不包含 choices');
      }
      
      // 对于 GPT-5 Image，检查 choice 对象的所有字段
      if (isGpt5Image) {
        console.log('📋 Choice 对象字段:', Object.keys(choice));
        // GPT-5 Image 可能直接在 choice 中返回图像数据
        if (choice.image) {
          console.log('✅ 在 choice.image 中找到图像数据');
        }
        if (choice.images && Array.isArray(choice.images)) {
          console.log(`✅ 在 choice.images 中找到 ${choice.images.length} 个图像`);
        }
        if (choice.image_url) {
          console.log('✅ 在 choice.image_url 中找到图像 URL');
        }
      }
      
      const message = choice.message;
      if (!message) {
        // 对于 GPT-5 Image，可能没有 message 字段，图像数据可能在 choice 的其他字段中
        if (isGpt5Image && (choice.image || choice.images || choice.image_url)) {
          console.log('⚠️ GPT-5 Image 响应没有 message 字段，但找到了图像数据字段');
          // 继续处理，不抛出错误
        } else {
          console.error('OpenRouter 响应结构:', JSON.stringify(resp.data, null, 2));
          throw new Error('OpenRouter 返回数据不包含 message');
        }
      }
      
      // 检查 content 类型
      let imageData = null;
      let imageUrl = null;
      
      // 辅助函数：验证是否为有效的 base64 字符串
      const isValidBase64 = (str) => {
        if (!str || typeof str !== 'string') return false;
        // 移除可能的空白字符
        const cleaned = str.trim().replace(/\s/g, '');
        // 检查 base64 格式（可能包含 = 填充）
        return /^[A-Za-z0-9+/=]+$/.test(cleaned) && cleaned.length > 100; // 至少要有一定长度
      };
      
      // 辅助函数：清理 base64 数据
      const cleanBase64 = (str) => {
        return str.trim().replace(/\s/g, '').replace(/^data:image\/[^;]+;base64,/, '');
      };
      
      // 辅助函数：从文本中提取 base64 图像数据（更强大的提取逻辑）
      const extractBase64FromText = (text) => {
        if (!text || typeof text !== 'string') return null;
        
        // 方法1: 查找完整的 data:image URL
        const dataUrlPattern = /data:image\/([^;]+);base64,([A-Za-z0-9+/=\s]+)/g;
        let match;
        while ((match = dataUrlPattern.exec(text)) !== null) {
          const mimeType = match[1];
          const base64Data = match[2].replace(/\s/g, '');
          if (isValidBase64(base64Data) && base64Data.length > 100) {
            return `data:image/${mimeType};base64,${base64Data}`;
          }
        }
        
        // 方法2: 查找被引号或特殊字符包围的 base64（可能是 JSON 格式）
        const jsonBase64Pattern = /["']([A-Za-z0-9+/]{500,}={0,2})["']/g;
        while ((match = jsonBase64Pattern.exec(text)) !== null) {
          const base64Data = match[1].replace(/\s/g, '');
          if (isValidBase64(base64Data)) {
            return `data:image/png;base64,${base64Data}`;
          }
        }
        
        // 方法3: 查找长 base64 字符串（可能包含换行符）
        const longBase64Pattern = /([A-Za-z0-9+/=\s]{500,})/g;
        while ((match = longBase64Pattern.exec(text)) !== null) {
          const candidate = match[1].replace(/\s/g, '').replace(/\n/g, '');
          if (isValidBase64(candidate) && candidate.length > 500) {
            return `data:image/png;base64,${candidate}`;
          }
        }
        
        // 方法4: 尝试解析为 JSON，查找 base64 字段
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            // 查找常见的 base64 字段名
            const base64Fields = ['data', 'image', 'base64', 'b64', 'image_data', 'imageData'];
            for (const field of base64Fields) {
              if (parsed[field] && typeof parsed[field] === 'string') {
                const cleaned = parsed[field].replace(/\s/g, '');
                if (isValidBase64(cleaned) && cleaned.length > 100) {
                  return `data:image/png;base64,${cleaned}`;
                }
              }
            }
          }
        } catch (e) {
          // 不是有效的 JSON，继续其他方法
        }
        
        return null;
      };
      
      if (typeof message.content === 'string') {
        // 如果 content 是字符串，可能是 base64 编码的图像数据
        // 或者包含图像 URL
        if (message.content.startsWith('data:image')) {
          // 已经是 data URL，验证并清理
          const cleaned = cleanBase64(message.content);
          if (isValidBase64(cleaned)) {
            // 提取 MIME 类型
            const mimeMatch = message.content.match(/data:image\/([^;]+)/);
            const mimeType = mimeMatch ? `image/${mimeMatch[1]}` : 'image/png';
            imageUrl = `data:${mimeType};base64,${cleaned}`;
            console.log('✅ 从 content 中提取到 data URL');
          } else {
            console.error('❌ 检测到无效的 base64 数据（data URL 格式）');
            console.error('Content 前200字符:', message.content.substring(0, 200));
            // 继续尝试其他提取方法
          }
        } else if (message.content.startsWith('http://') || message.content.startsWith('https://')) {
          imageUrl = message.content;
          console.log('✅ 从 content 中提取到 HTTP URL');
        }
        
        // 如果还没有找到，尝试从文本中提取 base64
        if (!imageUrl) {
          // 首先尝试作为纯 base64 处理
          const cleaned = cleanBase64(message.content);
          if (isValidBase64(cleaned) && cleaned.length > 100) {
            imageUrl = `data:image/png;base64,${cleaned}`;
            console.log('✅ Content 是纯 base64 数据');
          } else {
            // 使用强大的文本提取函数
            console.log('🔍 尝试从文本内容中提取 base64 图像数据...');
            const extracted = extractBase64FromText(message.content);
            if (extracted) {
              imageUrl = extracted;
              console.log('✅ 从文本中成功提取到 base64 图像数据');
            } else {
              // 尝试查找 HTTP URL
              const httpUrlMatch = message.content.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i);
              if (httpUrlMatch) {
                imageUrl = httpUrlMatch[0];
                console.log('✅ 从文本中提取到 HTTP URL:', imageUrl);
              }
            }
          }
        }
        
        // 如果仍然没有找到，记录详细信息
        if (!imageUrl) {
          console.warn('⚠️ 无法从字符串 content 中提取图像数据');
          console.warn('Content 长度:', message.content.length);
          console.warn('Content 前1000字符:', message.content.substring(0, 1000));
        }
      } else if (Array.isArray(message.content)) {
        // content 是数组，查找图像部分
        for (const part of message.content) {
          console.log('🔍 检查 content part:', { type: part.type, keys: Object.keys(part) });
          
          // 检查 inlineData（Gemini 格式）
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ 找到 inlineData');
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            
            if (isValidBase64(base64Data)) {
              imageUrl = `data:${mimeType};base64,${base64Data}`;
              console.log('✅ 使用 inlineData 创建 imageUrl');
              break;
            } else {
              console.error('❌ inlineData 包含无效的 base64 数据');
              console.error('inlineData.data 前200字符:', base64Data.substring(0, 200));
            }
          }
          
          // 检查 image_url（OpenAI 格式）
          if (part.type === 'image_url' && part.image_url?.url) {
            const url = part.image_url.url;
            // 验证 data URL 格式
            if (url.startsWith('data:image')) {
              const cleaned = cleanBase64(url);
              if (isValidBase64(cleaned)) {
                imageUrl = url;
                console.log('✅ 使用 image_url 创建 imageUrl');
              } else {
                console.error('❌ 检测到无效的 base64 数据（image_url 格式）');
                console.error('URL 前200字符:', url.substring(0, 200));
                continue; // 跳过这个无效的 URL，继续查找
              }
            } else {
              imageUrl = url;
              console.log('✅ 使用 image_url (HTTP URL)');
            }
            if (imageUrl) break;
          } else if (part.type === 'text' && part.text) {
            // 文本内容可能包含图像 URL 或 base64
            const text = part.text;
            if (text.startsWith('data:image')) {
              const cleaned = cleanBase64(text);
              if (isValidBase64(cleaned)) {
                imageUrl = text;
                console.log('✅ 从 text part 中提取 data URL');
                break;
              }
            } else if (text.startsWith('http://') || text.startsWith('https://')) {
              imageUrl = text;
              console.log('✅ 从 text part 中提取 HTTP URL');
              break;
            } else {
              // 尝试从文本中提取 base64（使用强大的提取函数）
              const extracted = extractBase64FromText(text);
              if (extracted) {
                imageUrl = extracted;
                console.log('✅ 从 text part 中提取到 base64 图像数据');
                break;
              } else if (isValidBase64(text.trim().replace(/\s/g, '')) && text.trim().length > 100) {
                // 纯 base64 字符串（没有前缀）
                imageUrl = `data:image/png;base64,${text.trim().replace(/\s/g, '')}`;
                console.log('✅ 从 text part 中提取纯 base64');
                break;
              }
            }
          }
        }
      }
      
      // 如果还没有找到图像，检查是否有其他字段
      if (!imageUrl) {
        // 对于 GPT-5 Image，优先检查 choice 对象的图像字段
        if (isGpt5Image) {
          console.log('🔍 GPT-5 Image: 检查 choice 对象的图像字段...');
          
          // 检查 choice.image
          if (choice.image) {
            const img = choice.image;
            if (typeof img === 'string') {
              if (img.startsWith('data:image')) {
                const cleaned = cleanBase64(img);
                if (isValidBase64(cleaned)) {
                  imageUrl = img;
                  console.log('✅ 从 choice.image 中提取到 data URL');
                }
              } else if (img.startsWith('http://') || img.startsWith('https://')) {
                imageUrl = img;
                console.log('✅ 从 choice.image 中提取到 HTTP URL');
              } else {
                // 尝试提取 base64
                const extracted = extractBase64FromText(img);
                if (extracted) {
                  imageUrl = extracted;
                  console.log('✅ 从 choice.image 中提取到 base64 数据');
                }
              }
            }
          }
          
          // 检查 choice.images 数组
          if (!imageUrl && choice.images && Array.isArray(choice.images) && choice.images.length > 0) {
            const firstImage = choice.images[0];
            if (typeof firstImage === 'string') {
              if (firstImage.startsWith('data:image')) {
                const cleaned = cleanBase64(firstImage);
                if (isValidBase64(cleaned)) {
                  imageUrl = firstImage;
                  console.log('✅ 从 choice.images[0] 中提取到 data URL');
                }
              } else if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                imageUrl = firstImage;
                console.log('✅ 从 choice.images[0] 中提取到 HTTP URL');
              } else {
                const extracted = extractBase64FromText(firstImage);
                if (extracted) {
                  imageUrl = extracted;
                  console.log('✅ 从 choice.images[0] 中提取到 base64 数据');
                }
              }
            } else if (typeof firstImage === 'object' && firstImage !== null) {
              // 可能是对象格式，检查常见字段
              const objStr = JSON.stringify(firstImage);
              const extracted = extractBase64FromText(objStr);
              if (extracted) {
                imageUrl = extracted;
                console.log('✅ 从 choice.images[0] 对象中提取到 base64 数据');
              } else if (firstImage.url) {
                imageUrl = firstImage.url;
                console.log('✅ 从 choice.images[0].url 中提取到 URL');
              } else if (firstImage.data) {
                const extracted = extractBase64FromText(firstImage.data);
                if (extracted) {
                  imageUrl = extracted;
                  console.log('✅ 从 choice.images[0].data 中提取到 base64 数据');
                }
              }
            }
          }
          
          // 检查 choice.image_url
          if (!imageUrl && choice.image_url) {
            const imgUrl = choice.image_url;
            if (typeof imgUrl === 'string') {
              if (imgUrl.startsWith('data:image')) {
                const cleaned = cleanBase64(imgUrl);
                if (isValidBase64(cleaned)) {
                  imageUrl = imgUrl;
                  console.log('✅ 从 choice.image_url 中提取到 data URL');
                }
              } else if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
                imageUrl = imgUrl;
                console.log('✅ 从 choice.image_url 中提取到 HTTP URL');
              } else {
                const extracted = extractBase64FromText(imgUrl);
                if (extracted) {
                  imageUrl = extracted;
                  console.log('✅ 从 choice.image_url 中提取到 base64 数据');
                }
              }
            } else if (typeof imgUrl === 'object' && imgUrl.url) {
              imageUrl = imgUrl.url;
              console.log('✅ 从 choice.image_url.url 中提取到 URL');
            }
          }
          
          // 检查 choice 对象中的其他可能字段
          if (!imageUrl) {
            const choiceKeys = Object.keys(choice);
            for (const key of choiceKeys) {
              if (['message', 'index', 'finish_reason', 'reasoning_details'].includes(key)) continue;
              const value = choice[key];
              if (typeof value === 'string' && value.length > 100) {
                const extracted = extractBase64FromText(value);
                if (extracted) {
                  imageUrl = extracted;
                  console.log(`✅ 从 choice.${key} 中提取到图像数据`);
                  break;
                }
              }
            }
          }
        }
        
        // 检查 message 对象的所有字段（如果存在）
        if (!imageUrl && message) {
          console.log('🔍 检查 message 对象的所有字段:', Object.keys(message));
          for (const key of Object.keys(message)) {
            if (key === 'content' || key === 'role') continue;
            const value = message[key];
            if (typeof value === 'string') {
              // 尝试从字符串字段中提取 base64
              const extracted = extractBase64FromText(value);
              if (extracted) {
                imageUrl = extracted;
                console.log(`✅ 从 message.${key} 中提取到图像数据`);
                break;
              }
              // 检查是否是 HTTP URL
              if (value.startsWith('http://') || value.startsWith('https://')) {
                imageUrl = value;
                console.log(`✅ 从 message.${key} 中找到 HTTP URL`);
                break;
              }
            } else if (typeof value === 'object' && value !== null) {
              // 递归检查对象字段
              const objStr = JSON.stringify(value);
              const extracted = extractBase64FromText(objStr);
              if (extracted) {
                imageUrl = extracted;
                console.log(`✅ 从 message.${key} 对象中提取到图像数据`);
                break;
              }
            }
          }
        }
        
        // 检查 choice 对象的其他字段
        if (!imageUrl) {
          console.log('🔍 检查 choice 对象的所有字段:', Object.keys(choice));
          for (const key of Object.keys(choice)) {
            if (key === 'message' || key === 'index' || key === 'finish_reason') continue;
            const value = choice[key];
            if (typeof value === 'string') {
              const extracted = extractBase64FromText(value);
              if (extracted) {
                imageUrl = extracted;
                console.log(`✅ 从 choice.${key} 中提取到图像数据`);
                break;
              }
            }
          }
        }
        
        // 检查 resp.data 的其他字段
        if (!imageUrl) {
          console.log('🔍 检查 resp.data 的所有字段:', Object.keys(resp.data));
          // 检查 data 数组（DALL-E 格式）
          if (resp.data?.data?.[0]?.b64_json) {
            const b64Data = resp.data.data[0].b64_json;
            if (isValidBase64(b64Data)) {
              imageUrl = `data:image/png;base64,${b64Data}`;
              console.log('✅ 从 resp.data.data[0].b64_json 中找到图像数据');
            }
          }
          // 检查 images 数组
          if (!imageUrl && resp.data?.images?.[0]) {
            const img = resp.data.images[0];
            if (typeof img === 'string') {
              const extracted = extractBase64FromText(img);
              if (extracted) {
                imageUrl = extracted;
                console.log('✅ 从 resp.data.images[0] 中提取到图像数据');
              } else if (img.startsWith('http://') || img.startsWith('https://')) {
                imageUrl = img;
                console.log('✅ 从 resp.data.images[0] 中找到 HTTP URL');
              }
            }
          }
          // 检查其他可能的字段
          const possibleFields = ['image', 'image_url', 'imageUrl', 'base64', 'b64', 'data'];
          for (const field of possibleFields) {
            if (!imageUrl && resp.data[field]) {
              const value = resp.data[field];
              if (typeof value === 'string') {
                const extracted = extractBase64FromText(value);
                if (extracted) {
                  imageUrl = extracted;
                  console.log(`✅ 从 resp.data.${field} 中提取到图像数据`);
                  break;
                }
              }
            }
          }
        }
        
        // 如果仍然没有找到，尝试从整个响应中提取（排除 reasoning_details）
        if (!imageUrl) {
          console.log('🔍 尝试从整个响应 JSON 中提取 base64 数据（排除 reasoning_details）...');
          // 创建一个副本，排除 reasoning_details（因为它可能包含大量加密数据）
          const responseCopy = { ...resp.data };
          if (responseCopy.reasoning_details) {
            delete responseCopy.reasoning_details;
            console.log('⚠️ 已排除 reasoning_details 字段以避免干扰');
          }
          const fullResponseStr = JSON.stringify(responseCopy);
          const extracted = extractBase64FromText(fullResponseStr);
          if (extracted) {
            imageUrl = extracted;
            console.log('✅ 从完整响应 JSON 中提取到图像数据');
          }
        }
        
        // 对于 GPT-5 Image，如果仍然没有找到，检查是否有流式响应或其他格式
        if (!imageUrl && isGpt5Image) {
          console.log('🔍 GPT-5 Image: 检查流式响应或其他特殊格式...');
          // 检查是否有 delta 字段（流式响应）
          if (choice.delta) {
            console.log('⚠️ 检测到 delta 字段（流式响应），可能需要特殊处理');
            if (choice.delta.content) {
              const extracted = extractBase64FromText(choice.delta.content);
              if (extracted) {
                imageUrl = extracted;
                console.log('✅ 从 choice.delta.content 中提取到图像数据');
              }
            }
          }
          
          // 检查响应顶层是否有图像字段
          if (!imageUrl && resp.data.image) {
            const extracted = extractBase64FromText(resp.data.image);
            if (extracted) {
              imageUrl = extracted;
              console.log('✅ 从 resp.data.image 中提取到图像数据');
            }
          }
          
          if (!imageUrl && resp.data.images && Array.isArray(resp.data.images)) {
            const firstImg = resp.data.images[0];
            if (typeof firstImg === 'string') {
              const extracted = extractBase64FromText(firstImg);
              if (extracted) {
                imageUrl = extracted;
                console.log('✅ 从 resp.data.images[0] 中提取到图像数据');
              }
            }
          }
        }
        
        // 最后，如果还是没有找到，抛出详细错误
        if (!imageUrl) {
          console.error('❌ 未找到图像数据');
          console.error('OpenRouter 完整响应:', JSON.stringify(resp.data, null, 2));
          console.error('尝试过的提取方法:');
          console.error('1. message.content (字符串和数组)');
          console.error('2. message 对象的所有字段');
          console.error('3. choice 对象的所有字段');
          console.error('4. resp.data 的所有字段');
          console.error('5. 完整响应 JSON 解析');
          throw new Error('OpenRouter 返回数据不包含可识别的图像内容。请检查控制台日志查看详细的响应结构。');
        }
      }
      
      // 最终验证 imageUrl
      if (!imageUrl) {
        console.error('❌ 无法从响应中提取有效的图像 URL');
        console.error('🔍 调试信息:');
        console.error('- message.content 类型:', typeof message.content);
        console.error('- message.content 是否为数组:', Array.isArray(message.content));
        console.error('- message 的所有键:', Object.keys(message));
        console.error('- choice 的所有键:', Object.keys(choice));
        console.error('- resp.data 的所有键:', Object.keys(resp.data));
        
        // 尝试查找所有可能包含图像数据的字段
        const possibleImageFields = [];
        if (message.content) possibleImageFields.push('message.content');
        if (message.image) possibleImageFields.push('message.image');
        if (choice.image) possibleImageFields.push('choice.image');
        if (resp.data.data) possibleImageFields.push('resp.data.data');
        if (resp.data.images) possibleImageFields.push('resp.data.images');
        
        console.error('- 可能包含图像的字段:', possibleImageFields);
        console.error('完整响应:', JSON.stringify(resp.data, null, 2));
        throw new Error('无法从 API 响应中提取图像数据。请检查控制台日志查看详细的响应结构。');
      }
      
      // 如果是 data URL，再次验证
      if (imageUrl.startsWith('data:image')) {
        const cleaned = cleanBase64(imageUrl);
        if (!isValidBase64(cleaned)) {
          console.error('❌ 最终生成的 imageUrl 包含无效的 base64 数据');
          console.error('imageUrl 前200字符:', imageUrl.substring(0, 200));
          throw new Error('生成的图像 URL 包含无效的 base64 数据');
        }
        console.log('✅ 验证通过：imageUrl 包含有效的 base64 数据');
      }
      
      return {
        success: true,
        data: {
          imageUrl: imageUrl,
          generationTime: Date.now() - startTime,
          provider: 'openrouter',
          modelId
        }
      };
    } catch (error) {
      console.error('❌ OpenRouter API 调用失败:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // 处理 401 认证错误
      if (error.response?.status === 401) {
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || 'User not found';
        
        console.error('🔴 认证失败 (401):', errorMessage);
        console.error('可能的原因:');
        console.error('1. API 密钥无效或已过期');
        console.error('2. API 密钥格式不正确');
        console.error('3. API 密钥未正确配置在 .env.local 文件中');
        console.error('4. 需要重启开发服务器以加载新的环境变量');
        console.error('');
        console.error('💡 解决方案:');
        console.error('1. 访问 https://openrouter.ai/keys 获取或创建新的 API 密钥');
        console.error('2. 确保 API 密钥以 "sk-or-v1-" 或 "sk-or-" 开头');
        console.error('3. 在项目根目录的 .env.local 文件中设置:');
        console.error('   VITE_OPENROUTER_API_KEY=sk-or-v1-你的密钥');
        console.error('4. 重启开发服务器 (npm run dev)');
        console.error('5. 确保 .env.local 文件在 .gitignore 中，不会被提交到版本控制');
        
        throw new Error(`OpenRouter API 认证失败 (401): ${errorMessage}。请检查 API 密钥是否正确配置。`);
      }
      
      // 处理其他 HTTP 错误
      if (error.response?.data) {
        const errorData = error.response.data;
        const errorMsg = errorData?.error?.message || JSON.stringify(errorData);
        throw new Error(`OpenRouter API 错误 (${error.response.status}): ${errorMsg}`);
      }
      
      // 处理网络错误
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error('OpenRouter API 请求超时，请检查网络连接后重试');
      }
      
      if (error.message?.includes('Network Error') || error.message?.includes('ERR_')) {
        throw new Error('网络连接失败，请检查网络连接');
      }
      
      throw error;
    }
  }
  
  // 辅助函数：将尺寸字符串转换为宽高比
  parseSizeToAspectRatio(size) {
    if (!size) return undefined;
    const match = size.match(/(\d+)x(\d+)/);
    if (match) {
      const width = parseInt(match[1]);
      const height = parseInt(match[2]);
      const ratio = width / height;
      if (Math.abs(ratio - 1.0) < 0.1) return '1:1';
      if (Math.abs(ratio - 16/9) < 0.1) return '16:9';
      if (Math.abs(ratio - 9/16) < 0.1) return '9:16';
      if (Math.abs(ratio - 4/3) < 0.1) return '4:3';
      if (Math.abs(ratio - 3/4) < 0.1) return '3:4';
    }
    return undefined;
  }

  // NanoBanana模型调用 - 使用Gemini 2.5 Flash Image模型
  async callNanoBanana(prompt, referenceImages = [], options = {}) {
    try {
      // 如果配置了 OpenRouter 模型，则优先走 OpenRouter
      if (this.orModelNanoBanana) {
        return await this.callOpenRouterImage(this.orModelNanoBanana, prompt, referenceImages, options);
      }
      console.log('🎨 调用NanoBanana模型 (Gemini 2.5 Flash Image):', {
        prompt,
        referenceImagesCount: referenceImages.length,
        options
      });

      if (!this.geminiApiKey && !this.isProxyEnabled) {
        throw new Error('Gemini API Key 未配置。请在 .env.local 文件中设置 VITE_GEMINI_API_KEY，然后重启开发服务器。');
      }

      const startTime = Date.now();
      
      // 构建请求体 - 使用Gemini 2.5 Flash Image模型
      const requestBody = {
        contents: [{
          role: "user",
          parts: []
        }]
      };

      // 如果有参考图像（图生图），添加图像部分
      if (referenceImages.length > 0) {
        console.log(`📸 图生图模式: 处理 ${referenceImages.length} 张参考图像`);
        for (let i = 0; i < referenceImages.length; i++) {
          const img = referenceImages[i];
          let imageData;
          let mimeType = 'image/jpeg';
          
          try {
            // 处理不同类型的图像URL
            if (img.startsWith('data:image')) {
              // Data URL格式: data:image/png;base64,xxx
              const parts = img.split(',');
              imageData = parts[1];
              const mimeMatch = img.match(/data:image\/([^;]+)/);
              if (mimeMatch) {
                mimeType = `image/${mimeMatch[1]}`;
              }
            } else if (img.startsWith('blob:')) {
              // Blob URL，需要先转换为Base64
              imageData = await this.imageToBase64(img);
              // 尝试从blob URL获取MIME类型（如果可能）
              try {
                const response = await fetch(img);
                const blob = await response.blob();
                mimeType = blob.type || 'image/png';
              } catch {
                mimeType = 'image/png'; // 默认
              }
            } else if (typeof img === 'string' && img.length > 100) {
              // 可能是Base64字符串（没有前缀）
              imageData = img;
              mimeType = 'image/png'; // 默认PNG
            } else {
              throw new Error('不支持的图像格式');
            }
            
            requestBody.contents[0].parts.push({
              inlineData: {
                mimeType: mimeType,
                data: imageData
              }
            });
            
            console.log(`✅ 图像 ${i + 1} 处理完成: ${mimeType}, 大小: ${(imageData.length * 3 / 4 / 1024).toFixed(2)}KB`);
          } catch (imgError) {
            console.error(`❌ 处理图像 ${i + 1} 失败:`, imgError);
            // 继续处理其他图像
          }
        }
      }

      // 添加文本提示词 - 对于图像生成，需要明确请求生成图像
      const imageGenerationPrompt = referenceImages.length > 0 
        ? `基于提供的参考图像，生成以下描述的图像：${prompt}`
        : `生成以下描述的图像：${prompt}`;
      
      requestBody.contents[0].parts.push({
        text: imageGenerationPrompt
      });

      // 添加生成配置
      // 注意：Gemini 2.5 Flash Image 模型不支持 responseMimeType 设置为 image/png
      // 模型会自动返回图像数据，不需要设置 responseMimeType
      requestBody.generationConfig = {
        temperature: 0.7,
        maxOutputTokens: 8192
        // 不设置 responseMimeType，让模型自动返回图像
      };

      // 如果启用代理，直接走后端/边缘代理（模型固定为 Gemini 2.5 Flash Image）
      let response;
      let usedModel = '';
      if (this.isProxyEnabled) {
        const proxyUrl = `${this.baseURL.replace(/\/+$/, '')}/ai/gemini/generate`;
        console.log(`🛰️ 通过代理调用: ${proxyUrl}`);
        response = await axios.post(proxyUrl, requestBody, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 60000
        });
        usedModel = 'gemini-2.5-flash-image';
      } else {
        // 仅使用官方 Gemini 2.5 Flash Image 单一端点
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${this.geminiApiKey}`;
        console.log(`🔄 调用端点: ${endpoint.replace(this.geminiApiKey, 'API_KEY_HIDDEN')}`);
        response = await axios.post(endpoint, requestBody, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 60000
        });
        usedModel = 'gemini-2.5-flash-image';
      }

      // 解析响应，提取生成的图像
      const apiResponse = response.data;
      const generationTime = (Date.now() - startTime) / 1000;

      console.log('📥 API响应结构:', JSON.stringify(apiResponse, null, 2));

      // Gemini 2.5 Flash Image模型返回的图像可能在多个位置
      let imageData = null;
      let imageMimeType = 'image/png';
      
      if (apiResponse.candidates && apiResponse.candidates.length > 0) {
        const candidate = apiResponse.candidates[0];
        
        // 检查content.parts中的图像数据
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              imageData = part.inlineData.data;
              imageMimeType = part.inlineData.mimeType || 'image/png';
              console.log('✅ 找到图像数据 (inlineData):', {
                mimeType: imageMimeType,
                dataLength: imageData.length,
                dataPreview: imageData.substring(0, 50) + '...'
              });
              break;
            }
            // 有些模型可能返回图像URL
            if (part.text && part.text.includes('http')) {
              const urlMatch = part.text.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
              if (urlMatch) {
                console.log('✅ 找到图像URL:', urlMatch[0]);
                // 如果是URL，直接返回URL
                return {
                  success: true,
                  data: {
                    imageUrl: urlMatch[0],
                    model: `Gemini ${usedModel}`,
                    generationTime: generationTime.toFixed(2),
                    parameters: {
                      prompt,
                      referenceImagesCount: referenceImages.length,
                      options
                    }
                  }
                };
              }
            }
          }
        }
      }

      // 如果还是没有找到图像，检查是否有其他格式
      if (!imageData) {
        // 检查是否有错误信息
        if (apiResponse.error) {
          throw new Error(`API错误: ${apiResponse.error.message || JSON.stringify(apiResponse.error)}`);
        }
        
        // 如果返回的是文本描述而不是图像，说明模型不支持图像生成
        // 这种情况下，我们需要使用其他方法或提示用户
        console.warn('⚠️ API响应中未找到图像数据，可能该模型不支持图像生成');
        console.warn('响应内容:', JSON.stringify(apiResponse, null, 2));
        throw new Error('该模型不支持图像生成功能，请使用支持图像生成的模型');
      }

      // 清理 base64 数据：移除可能的 data URL 前缀
      let cleanBase64 = imageData;
      const originalLength = cleanBase64.length;
      
      if (cleanBase64.includes(',')) {
        // 如果包含逗号，可能是 data URL 格式，提取 base64 部分
        cleanBase64 = cleanBase64.split(',')[1];
        console.log('🔧 检测到 data URL 格式，已提取 base64 部分');
      }
      // 移除可能的空白字符
      cleanBase64 = cleanBase64.trim().replace(/\s/g, '');
      
      console.log('🔧 Base64 数据清理:', {
        originalLength,
        cleanedLength: cleanBase64.length,
        removedChars: originalLength - cleanBase64.length
      });
      
      // 验证 base64 字符串格式
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        console.error('❌ 无效的 base64 数据格式');
        console.error('数据前100字符:', cleanBase64.substring(0, 100));
        throw new Error('API返回的图像数据格式无效');
      }
      
      console.log('✅ Base64 数据验证通过');

      // 将Base64图像数据转换为Blob URL，使用正确的 MIME 类型
      let imageBlob;
      try {
        imageBlob = this.base64ToBlob(cleanBase64, imageMimeType);
      } catch (blobError) {
        console.error('❌ 转换 base64 到 Blob 失败:', blobError);
        // 如果转换失败，尝试使用 PNG 格式
        console.warn('⚠️ 尝试使用 PNG 格式重新转换');
        imageBlob = this.base64ToBlob(cleanBase64, 'image/png');
        imageMimeType = 'image/png';
      }
      
      const imageUrl = URL.createObjectURL(imageBlob);

      console.log('✅ 图像生成完成:', {
        model: usedModel,
        generationTime: generationTime.toFixed(2) + 's',
        imageSize: (cleanBase64.length * 3 / 4 / 1024).toFixed(2) + 'KB',
        mimeType: imageMimeType
      });

      return {
        success: true,
        data: {
          imageUrl: imageUrl,
          model: `Gemini ${usedModel}`,
          generationTime: generationTime.toFixed(2),
          parameters: {
            prompt,
            referenceImagesCount: referenceImages.length,
            options
          }
        }
      };
    } catch (error) {
      console.error('❌ NanoBanana模型调用失败:', error);
      
      // 直接抛出错误，不进行降级或重试
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        
        if (status === 400) {
          throw new Error(`Gemini API请求错误: ${errorMessage}`);
        } else if (status === 401) {
          throw new Error(`Gemini API密钥无效或未授权`);
        } else if (status === 403) {
          throw new Error(`Gemini API无权限访问此资源`);
        } else if (status === 429) {
          throw new Error(`Gemini API配额已用尽，请稍后重试`);
        } else if (status >= 500) {
          throw new Error(`Gemini API服务器错误 (${status})，请稍后重试`);
        } else {
          throw new Error(`Gemini API错误 (${status}): ${errorMessage}`);
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`Gemini API请求超时，请检查网络连接后重试`);
      } else if (error.message?.includes('Network Error') || error.message?.includes('ERR_')) {
        throw new Error(`网络连接失败，请检查网络连接`);
      } else {
        throw new Error(`NanoBanana模型调用失败: ${error.message || '未知错误'}`);
      }
    }
  }

  // GPT-5 Image（占位实现：当前复用 NanoBanana 的生成流程/代理）
  async callGpt5Image(prompt, referenceImages = [], options = {}) {
    if (this.orModelGpt5Image) {
      return this.callOpenRouterImage(this.orModelGpt5Image, prompt, referenceImages, options);
    }
    return this.callNanoBanana(prompt, referenceImages, options);
  }

  // GPT-5 Image Mini（占位实现：当前复用 NanoBanana 的生成流程/代理）
  async callGpt5ImageMini(prompt, referenceImages = [], options = {}) {
    if (this.orModelGpt5ImageMini) {
      return this.callOpenRouterImage(this.orModelGpt5ImageMini, prompt, referenceImages, options);
    }
    return this.callNanoBanana(prompt, referenceImages, options);
  }

  // Base64转Blob
  base64ToBlob(base64, mimeType = 'image/png') {
    try {
      // 确保 base64 字符串是有效的
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Base64 数据无效：不是字符串');
      }
      
      // 解码 base64
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error('❌ base64ToBlob 转换失败:', error);
      console.error('Base64 数据长度:', base64?.length);
      console.error('Base64 数据前100字符:', base64?.substring(0, 100));
      throw new Error(`Base64 转换失败: ${error.message}`);
    }
  }

  // SeeDream模型调用 - 火山引擎 Doubao-SeeDream-4.0
  async callSeaDream(prompt, referenceImages = [], options = {}) {
    try {
      console.log('🎨 调用SeeDream模型 (火山引擎 Doubao-SeeDream-4.0):', {
        prompt,
        referenceImagesCount: referenceImages.length,
        options
      });

      if (!this.volcanoApiKey) {
        throw new Error('火山引擎 API Key 未配置');
      }

      const startTime = Date.now();
      
      // 使用代理路径避免 CORS 问题（开发环境）
      // 生产环境需要配置后端代理或使用其他方案
      const isDevelopment = import.meta.env.DEV;
      const endpoint = isDevelopment 
        ? '/api/volcano/images/generations'  // 使用 Vite 代理
        : `${this.volcanoBaseURL}/images/generations`;  // 直接调用（可能仍有 CORS 问题）

      // 构建请求体
      const requestBody = {
        model: this.volcanoModelId,
        prompt: prompt,
        size: options.size || '2K',
        response_format: 'url',
        watermark: options.watermark !== false, // 默认添加水印
        stream: false
      };

      // 如果有参考图像（图生图模式），添加图像数组
      if (referenceImages.length > 0) {
        console.log(`📸 图生图模式: 处理 ${referenceImages.length} 张参考图像`);
        const imageUrls = [];
        
        for (let i = 0; i < referenceImages.length; i++) {
          const img = referenceImages[i];
          let imageUrl = '';
          
          try {
            // 处理不同类型的图像
            if (img.startsWith('data:image')) {
              // Data URL格式：火山引擎API需要可访问的HTTP URL
              // 由于blob URL无法被外部API访问，我们需要将base64数据转换为可访问的URL
              // 这里我们保留data URL格式，看API是否支持
              // 如果不支持，可能需要先上传到临时存储
              imageUrl = img;
              console.log(`✅ 图像 ${i + 1} 使用 Data URL 格式`);
            } else if (img.startsWith('blob:')) {
              // Blob URL：无法被外部API直接访问
              // 需要先转换为base64或上传
              // 尝试从blob URL获取数据并转换为data URL
              try {
                const response = await fetch(img);
                const blob = await response.blob();
                const reader = new FileReader();
                const dataUrl = await new Promise((resolve, reject) => {
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                imageUrl = dataUrl;
                console.log(`✅ 图像 ${i + 1} 从 Blob URL 转换为 Data URL`);
              } catch (fetchError) {
                console.error(`❌ 无法从 Blob URL 获取图像数据:`, fetchError);
                throw new Error('无法处理 Blob URL 图像，请使用其他格式');
              }
            } else if (img.startsWith('http://') || img.startsWith('https://')) {
              // 已经是HTTP URL，直接使用
              imageUrl = img;
              console.log(`✅ 图像 ${i + 1} 使用 HTTP URL`);
            } else if (typeof img === 'string' && img.length > 100) {
              // 可能是Base64字符串（没有前缀），转换为data URL
              imageUrl = `data:image/png;base64,${img}`;
              console.log(`✅ 图像 ${i + 1} 转换为 Data URL`);
            } else {
              throw new Error('不支持的图像格式');
            }
            
            imageUrls.push(imageUrl);
            console.log(`✅ 图像 ${i + 1} 处理完成`);
          } catch (imgError) {
            console.error(`❌ 处理图像 ${i + 1} 失败:`, imgError);
            throw imgError; // 抛出错误，让调用者知道处理失败
          }
        }
        
        if (imageUrls.length > 0) {
          requestBody.image = imageUrls;
        }
      }

      // 如果设置了批量生成
      if (options.maxImages && options.maxImages > 1) {
        requestBody.sequential_image_generation = 'auto';
        requestBody.sequential_image_generation_options = {
          max_images: options.maxImages
        };
      }

      console.log('📤 发送请求到火山引擎:', {
        endpoint,
        model: this.volcanoModelId,
        hasImages: !!requestBody.image,
        imageCount: requestBody.image?.length || 0
      });

      // 发送请求
      // 在开发环境中，通过代理发送，API Key 通过自定义头传递
      // 在生产环境中，如果仍有 CORS 问题，需要配置后端代理
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (isDevelopment) {
        // 开发环境：通过代理，API Key 通过自定义头传递
        headers['X-Volcano-API-Key'] = this.volcanoApiKey;
      } else {
        // 生产环境：直接设置 Authorization（可能被 CORS 阻止）
        headers['Authorization'] = `Bearer ${this.volcanoApiKey}`;
      }
      
      // 直接发送请求，不重试，失败即报错
      const response = await axios.post(endpoint, requestBody, {
        headers: headers,
        timeout: 120000, // 120秒超时（图像生成可能需要更长时间）
        validateStatus: (status) => status >= 200 && status < 500 // 接受4xx错误以便处理
      });

      const generationTime = (Date.now() - startTime) / 1000;
      console.log('📥 火山引擎API响应:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {})
      });

      // 解析响应
      const responseData = response.data;
      
      if (responseData.error) {
        throw new Error(`火山引擎API错误: ${responseData.error.message || JSON.stringify(responseData.error)}`);
      }

      // 火山引擎返回格式：{ data: [{ url: "...", ... }] }
      let imageUrl = null;
      if (responseData.data && responseData.data.length > 0) {
        // 取第一张图片
        imageUrl = responseData.data[0].url;
        
        // 如果有多张图片，返回第一张（后续可以扩展支持多图）
        if (responseData.data.length > 1) {
          console.log(`📸 生成了 ${responseData.data.length} 张图片，返回第一张`);
        }
      }

      if (!imageUrl) {
        throw new Error('API响应中未找到生成的图像URL');
      }

      console.log('✅ 图像生成完成:', {
        model: 'Doubao-SeeDream-4.0',
        generationTime: generationTime.toFixed(2) + 's',
        imageUrl: imageUrl.substring(0, 50) + '...'
      });

      return {
        success: true,
        data: {
          imageUrl: imageUrl,
          model: 'Doubao-SeeDream-4.0',
          generationTime: generationTime.toFixed(2),
          parameters: {
            prompt,
            referenceImagesCount: referenceImages.length,
            options
          }
        }
      };
    } catch (error) {
      console.error('❌ SeeDream模型调用失败:', error);
      
      // 直接抛出错误，不进行降级或重试
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const errorMessage = errorData?.error?.message || JSON.stringify(errorData);
        
        console.error('API错误详情:', {
          status: status,
          data: errorData
        });
        
        // 根据不同的错误状态码提供明确的错误信息
        if (status === 400) {
          throw new Error(`火山引擎API请求错误: ${errorMessage}`);
        } else if (status === 401) {
          throw new Error(`火山引擎API密钥无效或未授权`);
        } else if (status === 403) {
          throw new Error(`火山引擎API无权限访问此资源`);
        } else if (status === 429) {
          throw new Error(`火山引擎API配额已用尽，请稍后重试`);
        } else if (status >= 500) {
          throw new Error(`火山引擎API服务器错误 (${status})，请稍后重试`);
        } else {
          throw new Error(`火山引擎API错误 (${status}): ${errorMessage}`);
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new Error(`火山引擎API请求超时，请检查网络连接后重试`);
      } else if (error.message?.includes('Network Error') || error.message?.includes('ERR_')) {
        throw new Error(`网络连接失败，请检查网络连接`);
      } else {
        throw new Error(`SeeDream模型调用失败: ${error.message || '未知错误'}`);
      }
    }
  }
  
  // Stable Diffusion模型调用
  async callStableDiffusion(prompt, referenceImages = [], options = {}) {
    try {
      // 在实际环境中，这里应该调用真实的API
      // 现在提供一个模拟实现
      console.log('调用Stable Diffusion模型:', {
        prompt,
        referenceImages,
        options
      });

      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 模拟返回结果
      return {
        success: true,
        data: {
          imageUrl: 'https://picsum.photos/800/600?random=3', // 模拟图片URL
          model: 'Stable Diffusion',
          generationTime: 2.0,
          parameters: {
            prompt,
            options
          }
        }
      };
    } catch (error) {
      console.error('Stable Diffusion模型调用失败:', error);
      
      // 直接抛出错误，不进行降级或重试
      throw new Error(`Stable Diffusion模型调用失败: ${error.message || '未知错误'}`);
    }
  }

  // 获取可用的Gemini模型列表
  async getAvailableModels() {
    try {
      // 如果启用代理，直接返回空列表，使用默认模型集合
      if (this.isProxyEnabled) {
        return [];
      }
      // 尝试v1beta版本
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`;
      const response = await axios.get(listUrl, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 500
      });
      
      if (response.status >= 200 && response.status < 300 && response.data && response.data.models) {
        const availableModels = response.data.models
          .filter(model => model.supportedGenerationMethods && 
                          model.supportedGenerationMethods.includes('generateContent'))
          .map(model => model.name);
        
        console.log('✅ 可用模型列表:', availableModels);
        return availableModels;
      } else {
        console.warn('获取模型列表返回非200状态:', response.status);
        return [];
      }
    } catch (error) {
      console.error('获取模型列表失败:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      // 如果获取模型列表失败，返回空数组，让代码使用默认模型列表
      return [];
    }
  }

  // 测试Gemini API连接
  async testGeminiConnection() {
    try {
      if (!this.geminiApiKey && !this.isProxyEnabled) {
        return { success: false, error: 'API密钥未配置', message: '请在 .env.local 文件中设置 VITE_GEMINI_API_KEY，然后重启开发服务器' };
      }

      // 使用简单的测试请求
      const testUrl = this.isProxyEnabled
        ? `${this.baseURL.replace(/\/+$/, '')}/ai/gemini/generate`
        : `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${this.geminiApiKey}`;
      const testBody = {
        contents: [{
          role: "user",
          parts: [{ text: "Hello" }]
        }]
      };

      // 增加超时时间并添加重试
      const maxRetries = 2;
      let lastError = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
          
          const response = await axios.post(testUrl, testBody, {
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 30000, // 30秒超时
            validateStatus: (status) => status >= 200 && status < 500
          });

          return {
            success: true,
            message: 'API连接成功',
            status: response.status,
            model: this.isProxyEnabled ? 'proxy(gemini-1.5-flash)' : 'gemini-pro',
            attempts: attempt + 1
          };
        } catch (error) {
          lastError = error;
          const isRetryable = 
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ENOTFOUND' ||
            error.message?.includes('timeout');
          
          if (!isRetryable || attempt >= maxRetries) {
            break;
          }
        }
      }

      return {
        success: false,
        error: lastError?.response?.status || lastError?.code || 'UNKNOWN',
        message: lastError?.response?.data?.error?.message || lastError?.message || '连接失败',
        status: lastError?.response?.status,
        data: lastError?.response?.data,
        attempts: maxRetries + 1
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.status || error.code || 'UNKNOWN',
        message: error.response?.data?.error?.message || error.message,
        status: error.response?.status,
        data: error.response?.data
      };
    }
  }

  // 提示词优化功能 - 使用Doubao-seed-1.6模型
  async optimizePrompt(userPrompt, options = {}) {
    try {
      console.log('优化提示词 (Doubao-seed-1.6):', {
        userPrompt,
        options,
        apiKey: this.doubaoSeedApiKey ? '已配置' : '未配置'
      });

      // 验证 API Key
      if (!this.doubaoSeedApiKey) {
        throw new Error('Doubao-seed-1.6 API Key 未配置');
      }

      const startTime = Date.now();
      
      // 构建完整的提示词，包含系统提示和用户输入
      const fullPrompt = `${this.promptOptimizationSystemPrompt}\n\n用户原始提示词：${userPrompt}\n\n请按照指定格式输出优化结果。`;

      // 使用Doubao-seed-1.6 API（火山引擎）
      const apiUrl = `${this.volcanoBaseURL}/chat/completions`;
      
      // 构建请求体（符合火山引擎API格式）
      // 根据图片中的API格式，content应该是字符串或对象数组
      const requestBody = {
        model: this.doubaoSeedModelId,
        messages: [
          {
            role: 'user',
            content: fullPrompt  // 直接使用字符串，符合火山引擎API格式
          }
        ],
        max_completion_tokens: 65535,
        temperature: 0.7
      };

      console.log('📤 发送请求到 Doubao-seed-1.6:', {
        url: apiUrl,
        model: this.doubaoSeedModelId,
        promptLength: fullPrompt.length
      });

      // 发送请求
      let response;
      try {
        response = await axios.post(apiUrl, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.doubaoSeedApiKey}`
          },
          timeout: 60000
        });
      } catch (apiError) {
        // 如果API调用失败，使用本地优化作为降级方案
        console.error('Doubao-seed-1.6 API调用失败:', apiError);
        console.log('💡 使用本地优化方案作为降级...');
        const localResult = this.localOptimizePrompt(userPrompt, options);
        localResult.data.parameters = localResult.data.parameters || {};
        localResult.data.parameters.isLocalOptimization = true;
        localResult.data.apiError = {
          message: apiError.message,
          status: apiError.response?.status,
          code: apiError.code
        };
        localResult.data.model = '本地智能优化引擎';
        return localResult;
      }

      // 解析响应
      const generationTime = (Date.now() - startTime) / 1000;
      const apiResponse = response.data;
      
      console.log('API响应数据:', JSON.stringify(apiResponse, null, 2));

      // 提取生成的文本内容
      let generatedText = '';
      if (apiResponse.choices && apiResponse.choices.length > 0) {
        const choice = apiResponse.choices[0];
        if (choice.message && choice.message.content) {
          // 处理content可能是字符串或数组的情况
          if (typeof choice.message.content === 'string') {
            generatedText = choice.message.content.trim();
          } else if (Array.isArray(choice.message.content)) {
            generatedText = choice.message.content
              .filter(item => item.type === 'text')
              .map(item => item.text || '')
              .join('\n')
              .trim();
          }
        }
      }

      console.log('提取的生成文本:', generatedText);

      // 解析优化结果（使用与原来相同的解析逻辑）
      let optimizedPrompt = '';
      let optimizationNotes = '';

      if (generatedText) {
        // 尝试多种格式匹配
        let match = generatedText.match(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|原始提示词)[^\n]+)*)/i);
        if (match && match[1]) {
          optimizedPrompt = match[1].trim();
        }

        if (!optimizedPrompt) {
          match = generatedText.match(/-?\s*(?:优化提示词|优化结果)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|-)[^\n]+)*)/i);
          if (match && match[1]) {
            optimizedPrompt = match[1].trim();
          }
        }

        if (!optimizedPrompt) {
          const lines = generatedText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/(?:优化提示词|优化结果|优化后的提示词)/i)) {
              optimizedPrompt = lines.slice(i, i + 3).join(' ').replace(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '').trim();
              break;
            }
          }
        }

        match = generatedText.match(/(?:优化说明|优化分析|优化建议)[：:]\s*([^\n]+(?:\n(?!优化提示词|原始提示词)[^\n]+)*)/i);
        if (match && match[1]) {
          optimizationNotes = match[1].trim();
        }

        if (!optimizedPrompt) {
          const lines = generatedText.split('\n').filter(line => line.trim() && !line.match(/^(原始提示词|优化说明|优化分析)/i));
          if (lines.length > 0) {
            optimizedPrompt = lines.reduce((longest, line) => 
              line.length > longest.length ? line : longest, lines[0]
            ).trim();
            
            const otherLines = lines.filter(line => line.trim() !== optimizedPrompt);
            if (otherLines.length > 0) {
              optimizationNotes = otherLines.join(' ').trim();
            }
          }
        }

        if (!optimizedPrompt) {
          optimizedPrompt = generatedText.trim();
          optimizationNotes = 'Doubao-seed-1.6 AI生成的详细优化提示词';
        }

        optimizedPrompt = optimizedPrompt
          .replace(/^(优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '')
          .replace(/^[-*]\s*/, '')
          .trim();
      } else {
        optimizedPrompt = `优化的${userPrompt}描述，包含详细的视觉元素、色彩方案和构图建议。`;
        optimizationNotes = '根据AI模型专业知识生成的优化提示词';
      }

      console.log('解析结果:', {
        optimizedPrompt: optimizedPrompt.substring(0, 100) + '...',
        optimizationNotes: optimizationNotes.substring(0, 50) + '...'
      });

      return {
        success: true,
        data: {
          originalPrompt: userPrompt,
          optimizedPrompt: optimizedPrompt,
          optimizationNotes: optimizationNotes,
          model: 'Doubao-seed-1.6',
          generationTime: generationTime.toFixed(2),
          parameters: {
            userPrompt,
            options
          }
        }
      };
    } catch (error) {
      console.error('Doubao-seed-1.6 API调用失败:', {
        error: error.message || error,
        userPrompt: userPrompt,
        apiKey: this.doubaoSeedApiKey ? '已配置' : '未配置'
      });
      
      console.log('使用本地智能优化引擎...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const localResult = this.localOptimizePrompt(userPrompt, options);
      if (!localResult.data.parameters) {
        localResult.data.parameters = {};
      }
      localResult.data.parameters.isLocalOptimization = true;
      localResult.data.apiError = {
        message: error.message,
        status: error.response?.status,
        code: error.code
      };
      localResult.data.model = '本地智能优化引擎';
      
      return localResult;
    }
  }

  // 旧版Gemini优化方法（已弃用，保留作为参考）
  async optimizePromptGemini(userPrompt, options = {}) {
    // 此方法已弃用，保留仅作为参考
    console.warn('⚠️ optimizePromptGemini 已弃用，请使用 optimizePrompt (Doubao-seed-1.6)');
    
    // 如果启用代理：直接走一次代理请求（模型统一为 Gemini 2.5 Flash Image）
    if (this.isProxyEnabled) {
        const proxyUrl = `${this.baseURL.replace(/\/+$/, '')}/ai/gemini/generate`;
        const requestBody = {
          contents: [
            { role: "user", parts: [{ text: fullPrompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
            topP: 0.9,
            topK: 40
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        };

        const response = await axios.post(proxyUrl, requestBody, {
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          timeout: 60000
        });

        // 之后解析逻辑与原来一致（沿用下方统一解析）
        const generationTime = (Date.now() - startTime) / 1000;
        const apiResponse = response.data;
        console.log('API响应数据:', JSON.stringify(apiResponse, null, 2));
        if (apiResponse.promptFeedback && apiResponse.promptFeedback.blockReason) {
          throw new Error(`Gemini API 内容安全限制: ${apiResponse.promptFeedback.blockReason}`);
        }
        let generatedText = '';
        if (apiResponse.candidates && apiResponse.candidates.length > 0) {
          const candidate = apiResponse.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            generatedText = candidate.content.parts.map(part => part.text || '').join('\n').trim();
          }
        }
        let optimizedPrompt = '';
        let optimizationNotes = '';
        if (generatedText) {
          let match = generatedText.match(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|原始提示词)[^\n]+)*)/i);
          if (match && match[1]) optimizedPrompt = match[1].trim();
          if (!optimizedPrompt) {
            match = generatedText.match(/-?\s*(?:优化提示词|优化结果)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|-)[^\n]+)*)/i);
            if (match && match[1]) optimizedPrompt = match[1].trim();
          }
          if (!optimizedPrompt) {
            const lines = generatedText.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].match(/(?:优化提示词|优化结果|优化后的提示词)/i)) {
                optimizedPrompt = lines.slice(i, i + 3).join(' ').replace(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '').trim();
                break;
              }
            }
          }
          match = generatedText.match(/(?:优化说明|优化分析|优化建议)[：:]\s*([^\n]+(?:\n(?!优化提示词|原始提示词)[^\n]+)*)/i);
          if (match && match[1]) optimizationNotes = match[1].trim();
          if (!optimizedPrompt) {
            const lines = generatedText.split('\n').filter(line => line.trim() && !line.match(/^(原始提示词|优化说明|优化分析)/i));
            if (lines.length > 0) {
              optimizedPrompt = lines.reduce((longest, line) => line.length > longest.length ? line : longest, lines[0]).trim();
              const otherLines = lines.filter(line => line.trim() !== optimizedPrompt);
              if (otherLines.length > 0) optimizationNotes = otherLines.join(' ').trim();
            }
          }
          if (!optimizedPrompt) {
            optimizedPrompt = generatedText.trim();
            optimizationNotes = 'Gemini AI生成的详细优化提示词';
          }
          optimizedPrompt = optimizedPrompt.replace(/^(优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '').replace(/^[-*]\s*/, '').trim();
        } else {
          optimizedPrompt = `优化的${userPrompt}描述，包含详细的视觉元素、色彩方案和构图建议。`;
          optimizationNotes = '根据AI模型专业知识生成的优化提示词';
        }
        return {
          success: true,
          data: {
            originalPrompt: userPrompt,
            optimizedPrompt,
            optimizationNotes,
            model: 'Gemini (提示词优化 via proxy)',
            generationTime: generationTime.toFixed(2),
            parameters: { userPrompt, options }
          }
        };
      }

      // ===== 无代理直连 Google：仅使用 Gemini 2.5 Flash Image 单一端点 =====
      const apiEndpoints = [
        { url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${this.geminiApiKey}`, method: 'POST', model: 'gemini-2.5-flash-image' }
      ];
      console.log(`📋 将尝试 ${apiEndpoints.length} 个API端点`);
      console.log('注意: Gemini API可能在某些地区有访问限制，如遇连接问题请检查网络环境');
      if (!this.geminiApiKey) {
        console.error('警告: Gemini API密钥未配置');
        throw new Error('Gemini API密钥未正确配置，请在 .env.local 文件中设置 VITE_GEMINI_API_KEY，然后重启开发服务器');
      }
      let response;
      let lastError;
      let successfulEndpoint = null;
      const allErrors = [];
      
      // 验证API key格式
      console.log('🔑 API Key验证:', {
        hasKey: !!this.geminiApiKey,
        keyLength: this.geminiApiKey?.length,
        keyPrefix: this.geminiApiKey?.substring(0, 10) + '...',
        keySuffix: '...' + this.geminiApiKey?.substring(this.geminiApiKey.length - 5)
      });
      
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`\n🔄 尝试API端点 [${endpoint.model}]:`);
          console.log('   URL:', endpoint.url.replace(this.geminiApiKey, 'API_KEY_HIDDEN'));
          
          // 构建标准的Gemini API请求体
          const requestBody = {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: fullPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2000,
              topP: 0.9,
              topK: 40
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH", 
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          };
          
          console.log('📤 发送请求:', {
            model: endpoint.model,
            promptLength: fullPrompt.length,
            requestBodyKeys: Object.keys(requestBody)
          });
          
          // 添加重试机制，最多重试3次
          const maxRetries = 3;
          let retryCount = 0;
          let lastAttemptError = null;
          
          while (retryCount <= maxRetries) {
            try {
              if (retryCount > 0) {
                // 指数退避：1s, 2s, 4s
                const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 4000);
                console.log(`   ⏳ 重试 ${retryCount}/${maxRetries}，等待 ${delay}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              response = await axios.post(
                endpoint.url,
                requestBody,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  timeout: 60000,  // 增加到60秒超时
                  // 添加额外的网络配置
                  validateStatus: function (status) {
                    return status >= 200 && status < 500; // 接受4xx错误以便处理
                  },
                  // 添加请求拦截器来处理网络问题
                  maxRedirects: 5,
                  // 允许跨域请求
                  withCredentials: false
                }
              );
              
              // 如果成功，跳出重试循环
              if (response.status >= 200 && response.status < 300) {
                break;
              } else {
                // 如果是4xx错误，不重试
                if (response.status >= 400 && response.status < 500) {
                  throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
                }
                // 5xx错误可以重试
                throw new Error(`HTTP ${response.status}: Server error`);
              }
            } catch (error) {
              lastAttemptError = error;
              
              // 如果是网络错误或超时，且还有重试次数，则重试
              // 注意：浏览器中的 ERR_CONNECTION_RESET 可能不会出现在 error.code 中
              const errorMessage = error.message || '';
              const errorCode = error.code || '';
              const isConnectionReset = 
                errorCode === 'ECONNRESET' ||
                errorMessage.includes('ERR_CONNECTION_RESET') ||
                errorMessage.includes('Connection reset') ||
                errorMessage.includes('net::ERR_CONNECTION_RESET');
              
              const isRetryableError = 
                errorCode === 'ECONNABORTED' || // 超时
                errorCode === 'ETIMEDOUT' ||    // 超时
                errorCode === 'ECONNREFUSED' || // 连接被拒绝
                errorCode === 'ENOTFOUND' ||    // DNS解析失败
                isConnectionReset ||             // 连接重置（浏览器错误）
                errorMessage.includes('timeout') ||
                errorMessage.includes('Network Error') ||
                errorMessage.includes('Failed to fetch') ||
                (error.response?.status >= 500 && error.response?.status < 600); // 5xx错误
              
              if (isRetryableError && retryCount < maxRetries) {
                retryCount++;
                console.log(`   ⚠️ 请求失败 (${error.message})，将重试...`);
                continue;
              } else {
                // 不可重试的错误或重试次数用尽，抛出错误
                throw error;
              }
            }
          }
          
          console.log('✅ API调用成功! 使用模型:', endpoint.model);
          console.log('   响应状态:', response.status);
          console.log('   响应数据结构:', {
            hasCandidates: !!response.data?.candidates,
            candidatesCount: response.data?.candidates?.length || 0
          });
          successfulEndpoint = endpoint;
          break; // 成功则跳出循环
        } catch (error) {
          lastError = error;
          const errorStatus = error.response?.status;
          const errorData = error.response?.data;
          const errorMessage = error.message || '';
          const errorCode = error.code || '';
          
          // 收集错误信息
          const errorInfo = {
            model: endpoint.model,
            status: errorStatus,
            message: errorMessage,
            data: errorData,
            url: endpoint.url.replace(this.geminiApiKey, 'API_KEY_HIDDEN')
          };
          allErrors.push(errorInfo);
          
          // 特别处理浏览器中的 ERR_CONNECTION_RESET
          if (errorMessage.includes('ERR_CONNECTION_RESET') || 
              errorMessage.includes('Connection reset') ||
              errorCode === 'ECONNRESET') {
            console.error(`\n🔴 检测到连接重置错误 (ERR_CONNECTION_RESET)`);
            console.error('   这通常是由以下原因引起的：');
            console.error('   1. 防火墙或网络代理阻止了连接');
            console.error('   2. 网络环境限制（某些地区无法直接访问Google服务）');
            console.error('   3. 公司或学校网络策略限制');
            console.error('   💡 解决方案：使用VPN或配置代理服务器');
          }
          
          // 提供更详细的错误分析和可能的解决方案
          let errorAnalysis = '';
          let possibleSolutions = [];
          
          console.error(`\n❌ 端点 ${endpoint.model} 调用失败:`);
          console.error('   状态码:', errorStatus || 'N/A');
          console.error('   错误消息:', errorMessage);
          
          if (errorStatus === 404) {
            errorAnalysis = `API端点不存在 (404) - 模型 ${endpoint.model} 可能不可用或API密钥无权限`;
            possibleSolutions = [
              '检查API密钥是否正确',
              '在Google Cloud Console中启用Generative Language API',
              '验证项目是否已启用结算功能',
              '确认API密钥有访问该模型的权限'
            ];
            if (errorData) {
              console.error('   错误详情:', JSON.stringify(errorData, null, 2));
            }
          } else if (errorStatus === 403) {
            errorAnalysis = 'API密钥无权限访问此资源 (403)';
            possibleSolutions = [
              '确认API密钥正确无误',
              '在Google Cloud Console中启用Generative Language API',
              '检查API密钥是否与正确的项目关联',
              '验证API密钥是否被限制或禁用',
              '检查API密钥是否已过期或被撤销'
            ];
            if (errorData) {
              console.error('   错误详情:', JSON.stringify(errorData, null, 2));
            }
          } else if (errorStatus === 429) {
            errorAnalysis = 'API配额已用尽 (429) - 免费层配额限制';
            
            // 尝试从错误信息中提取重试时间
            let retryAfter = null;
            if (errorData?.error?.message) {
              const retryMatch = errorData.error.message.match(/retry in ([\d.]+)s/i);
              if (retryMatch) {
                retryAfter = Math.ceil(parseFloat(retryMatch[1]));
              }
            }
            
            possibleSolutions = [
              '🔴 您的Gemini API免费配额已用尽',
              '1. 等待配额重置（通常每小时或每天重置）',
              retryAfter ? `2. 建议在 ${retryAfter} 秒后重试` : '2. 请稍后再试',
              '3. 检查您的API使用情况: https://aistudio.google.com/app/apikey',
              '4. 考虑升级到付费计划以获得更高配额',
              '5. 当前将使用本地优化方案作为备选'
            ];
            
            console.error('   ⚠️ 配额超限错误 - 这是API配额限制，不是代码问题');
            if (errorData?.error?.message) {
              console.error('   错误详情:', errorData.error.message);
              if (retryAfter) {
                console.error(`   💡 建议在 ${retryAfter} 秒（约 ${Math.ceil(retryAfter / 60)} 分钟）后重试`);
              }
            }
            if (errorData) {
              console.error('   完整错误信息:', JSON.stringify(errorData, null, 2));
            }
          } else if (errorStatus === 400) {
            errorAnalysis = '请求格式错误 (400)';
            possibleSolutions = [
              '检查请求体格式是否正确',
              '验证提示词内容是否符合要求'
            ];
            if (errorData) {
              console.error('   错误详情:', JSON.stringify(errorData, null, 2));
            }
          } else if (errorStatus === 401) {
            errorAnalysis = 'API密钥无效或未授权 (401)';
            possibleSolutions = [
              '验证API密钥是否正确',
              '检查API密钥是否已过期',
              '确认API密钥格式正确（应以AIzaSy开头）'
            ];
            if (errorData) {
              console.error('   错误详情:', JSON.stringify(errorData, null, 2));
            }
          } else if (error.code === 'ECONNRESET' || 
                     error.message?.includes('ERR_CONNECTION_RESET') || 
                     error.message?.includes('Connection reset')) {
            errorAnalysis = '连接被重置 (ERR_CONNECTION_RESET) - 这通常表示网络连接被防火墙或代理服务器中断';
            possibleSolutions = [
              '🔴 这是网络环境限制问题，不是代码问题',
              '1. 检查防火墙设置，确保允许访问 generativelanguage.googleapis.com',
              '2. 如果在公司网络，联系IT部门开放Google API访问权限',
              '3. 尝试使用VPN连接到可访问Google服务的网络',
              '4. 检查代理设置，可能需要配置代理服务器',
              '5. 如果在受限地区，需要使用代理或VPN',
              '6. 尝试使用移动热点或其他网络环境测试',
              '💡 临时解决方案：可以考虑通过后端服务器转发API请求'
            ];
            console.error('   ⚠️ 连接重置错误 - 这是网络环境问题');
            console.error('   错误代码:', error.code || 'ERR_CONNECTION_RESET');
            console.error('   错误消息:', error.message);
            console.error('   💡 建议：使用VPN或配置代理服务器');
          } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            errorAnalysis = '网络连接失败 - 无法连接到Google API服务器';
            possibleSolutions = [
              '检查网络连接是否正常',
              '确认可以访问Google服务（尝试访问 https://www.google.com）',
              '检查防火墙或代理设置',
              '尝试使用VPN（如果在受限地区）',
              '检查DNS设置是否正确',
              '尝试刷新页面后重试'
            ];
            console.error('   网络错误:', error.code);
            console.error('   建议: 检查网络连接和DNS设置');
          } else if (error.message?.includes('timeout') || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            errorAnalysis = '网络连接问题或API响应超时（已尝试重试）';
            possibleSolutions = [
              '检查网络连接速度',
              '确认可以访问Google API服务',
              '检查防火墙或代理设置',
              '尝试使用更稳定的网络连接',
              '如果使用VPN，尝试切换节点',
              '稍后重试（可能是临时网络问题）'
            ];
            console.error('   超时错误:', error.message || error.code);
            console.error('   已自动重试，但所有尝试均失败');
          } else {
            errorAnalysis = `未知错误 (${errorStatus || error.code || 'N/A'})`;
            possibleSolutions = [
              '在Google Cloud Console中检查API使用情况和错误日志',
              '确认项目已启用Generative Language API',
              '检查API密钥是否被正确配置',
              '查看浏览器控制台的完整错误信息'
            ];
            console.error('   完整错误对象:', {
              status: errorStatus,
              code: error.code,
              message: errorMessage,
              data: errorData,
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            });
          }
          
          errorInfo.analysis = errorAnalysis;
          errorInfo.solutions = possibleSolutions;
          
          // 继续尝试下一个端点
          continue;
        }
      }
      
      // 如果所有端点都失败，启动本地降级方案
      if (!response) {
        console.error('\n⚠️ 所有API端点调用失败，启动本地降级方案');
        console.error('='.repeat(60));
        console.error('📊 错误汇总:');
        console.error(`   尝试了 ${allErrors.length} 个端点，全部失败`);
        console.error('\n详细错误信息:');
        allErrors.forEach((err, index) => {
          console.error(`\n${index + 1}. 模型: ${err.model}`);
          console.error(`   状态码: ${err.status || 'N/A'}`);
          console.error(`   错误: ${err.message}`);
          if (err.data) {
            console.error(`   详情:`, JSON.stringify(err.data, null, 2));
          }
          if (err.analysis) {
            console.error(`   分析: ${err.analysis}`);
          }
          if (err.solutions && err.solutions.length > 0) {
            console.error(`   建议解决方案:`);
            err.solutions.forEach((sol, i) => {
              console.error(`     ${i + 1}. ${sol}`);
            });
          }
        });
        console.error('='.repeat(60));
        
        // 检查是否有共同的错误模式
        const statusCodes = allErrors.map(e => e.status).filter(Boolean);
        const uniqueStatuses = [...new Set(statusCodes)];
        if (uniqueStatuses.length === 1) {
          console.error(`\n🔍 所有端点返回相同的状态码: ${uniqueStatuses[0]}`);
          if (uniqueStatuses[0] === 404) {
            console.error('   可能原因: API密钥无效或未启用Generative Language API');
          } else if (uniqueStatuses[0] === 403) {
            console.error('   可能原因: API密钥无权限或已被限制');
          } else if (uniqueStatuses[0] === 400) {
            console.error('   可能原因: 请求格式不正确');
          }
        }
        
        // 返回本地优化结果作为降级方案
        console.log('\n💡 使用本地优化方案 - 即使在API不可用时也能提供基本功能');
        const localResult = this.localOptimizePrompt(userPrompt, options);
        console.log('✅ 本地优化完成，返回结果');
        
        // 确保isLocalOptimization标志被正确设置
        if (!localResult.data.parameters) {
          localResult.data.parameters = {};
        }
        localResult.data.parameters.isLocalOptimization = true;
        
        // 增强返回信息，包含API失败的详细原因
        if (lastError) {
          localResult.data.apiError = {
            message: lastError.message,
            status: lastError.response?.status,
            code: lastError.code,
            allErrors: allErrors.map(e => ({
              model: e.model,
              status: e.status,
              message: e.message,
              analysis: e.analysis
            })),
            endpointAttempted: apiEndpoints.map(e => e.model),
            fallbackUsed: 'local_optimization',
            troubleshooting: {
              commonStatus: uniqueStatuses.length === 1 ? uniqueStatuses[0] : null,
              totalAttempts: allErrors.length,
              suggestions: allErrors[0]?.solutions || []
            }
          };
        }
        
        // 确保模型名称正确标识为本地优化
        localResult.data.model = '本地智能优化引擎';
        
        console.log('📋 返回的本地优化结果:', {
          isLocalOptimization: localResult.data.parameters.isLocalOptimization,
          model: localResult.data.model,
          hasApiError: !!localResult.data.apiError
        });
        
        return localResult;
      }
      
      // 解析Gemini API响应
      const generationTime = (Date.now() - startTime) / 1000;
      const apiResponse = response.data;
      
      console.log('API响应数据:', JSON.stringify(apiResponse, null, 2));
      
      // 检查API响应是否包含错误
      if (apiResponse.promptFeedback && apiResponse.promptFeedback.blockReason) {
        throw new Error(`Gemini API 内容安全限制: ${apiResponse.promptFeedback.blockReason}`);
      }
      
      // 提取生成的文本内容 - 改进的解析逻辑
      let generatedText = '';
      if (apiResponse.candidates && apiResponse.candidates.length > 0) {
        const candidate = apiResponse.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          // 合并所有parts的文本内容
          generatedText = candidate.content.parts
            .map(part => part.text || '')
            .join('\n')
            .trim();
        }
      }
      
      console.log('提取的生成文本:', generatedText);
      
      // 解析优化结果
      let optimizedPrompt = '';
      let optimizationNotes = '';
      
      if (generatedText) {
        // 尝试多种格式匹配
        // 格式1: 优化提示词：[内容]
        let match = generatedText.match(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|原始提示词)[^\n]+)*)/i);
        if (match && match[1]) {
          optimizedPrompt = match[1].trim();
        }
        
        // 格式2: - 优化提示词：[内容]
        if (!optimizedPrompt) {
          match = generatedText.match(/-?\s*(?:优化提示词|优化结果)[：:]\s*([^\n]+(?:\n(?!优化说明|优化分析|-)[^\n]+)*)/i);
          if (match && match[1]) {
            optimizedPrompt = match[1].trim();
          }
        }
        
        // 格式3: 查找包含"优化"关键词的段落
        if (!optimizedPrompt) {
          const lines = generatedText.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/(?:优化提示词|优化结果|优化后的提示词)/i)) {
              // 获取这一行和后续几行的内容
              optimizedPrompt = lines.slice(i, i + 3).join(' ').replace(/(?:优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '').trim();
              break;
            }
          }
        }
        
        // 提取优化说明
        match = generatedText.match(/(?:优化说明|优化分析|优化建议)[：:]\s*([^\n]+(?:\n(?!优化提示词|原始提示词)[^\n]+)*)/i);
        if (match && match[1]) {
          optimizationNotes = match[1].trim();
        }
        
        // 如果没有提取到结构化信息，使用智能分割
        if (!optimizedPrompt) {
          const lines = generatedText.split('\n').filter(line => line.trim() && !line.match(/^(原始提示词|优化说明|优化分析)/i));
          if (lines.length > 0) {
            // 找到最长的行作为优化提示词（通常是主要内容）
            optimizedPrompt = lines.reduce((longest, line) => 
              line.length > longest.length ? line : longest, lines[0]
            ).trim();
            
            // 其他行作为说明
            const otherLines = lines.filter(line => line.trim() !== optimizedPrompt);
            if (otherLines.length > 0) {
              optimizationNotes = otherLines.join(' ').trim();
            }
          }
        }
        
        // 如果还是没有提取到，使用整个文本
        if (!optimizedPrompt) {
          optimizedPrompt = generatedText.trim();
          optimizationNotes = 'Gemini AI生成的详细优化提示词';
        }
        
        // 清理优化提示词，移除可能的标记
        optimizedPrompt = optimizedPrompt
          .replace(/^(优化提示词|优化结果|优化后的提示词)[：:]\s*/i, '')
          .replace(/^[-*]\s*/, '')
          .trim();
      } else {
        // 如果API没有返回有效内容，使用一个默认的优化结果
        optimizedPrompt = `优化的${userPrompt}描述，包含详细的视觉元素、色彩方案和构图建议。`;
        optimizationNotes = '根据AI模型专业知识生成的优化提示词';
      }
      
      console.log('解析结果:', {
        optimizedPrompt: optimizedPrompt.substring(0, 100) + '...',
        optimizationNotes: optimizationNotes.substring(0, 50) + '...'
      });
      
      // 确保成功响应不包含任何回退相关标记
      return {
        success: true,
        data: {
          originalPrompt: userPrompt,
          optimizedPrompt: optimizedPrompt,
          optimizationNotes: optimizationNotes,
          model: 'Gemini (提示词优化)',
          generationTime: generationTime.toFixed(2),
          parameters: {
            userPrompt,
            options
          }
        }
      };
    } catch (error) {
      // 详细记录错误信息，便于调试
      console.error('Gemini API调用失败:', {
        error: error.message || error,
        userPrompt: userPrompt,
        apiKey: this.geminiApiKey ? '已配置' : '未配置',
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : '无响应对象'
      });
      
      // 明确告知用户使用了本地优化
      console.log('Gemini API调用失败，使用本地智能优化引擎...');
      
      // 模拟处理延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 确保在任何异常情况下都返回本地优化结果
      const localResult = this.localOptimizePrompt(userPrompt, options);
      
      // 确保isLocalOptimization标志被正确设置
      if (!localResult.data.parameters) {
        localResult.data.parameters = {};
      }
      localResult.data.parameters.isLocalOptimization = true;
      
      // 确保模型名称正确标识为本地优化
      localResult.data.model = '本地智能优化引擎';
      
      // 添加错误信息到返回结果中
      localResult.data.apiError = {
        message: error.message || '未知错误',
        status: error.response?.status,
        code: error.code,
        fallbackUsed: 'local_optimization_exception_handler'
      };
      
      console.log('📋 异常处理返回的本地优化结果:', {
        isLocalOptimization: localResult.data.parameters.isLocalOptimization,
        model: localResult.data.model,
        hasApiError: !!localResult.data.apiError
      });
      
      return localResult;
    }
  }

  // 增强的本地提示词优化逻辑，提供更实用的降级方案
  localOptimizePrompt(prompt, options = {}) {
    console.log('执行本地提示词优化...');
    
    // 提示词扩展模式
    const enhancePatterns = [
      "请详细描述",
      "提供具体步骤",
      "解释原因",
      "给出例子",
      "从多个角度分析"
    ];
    
    // 根据不同类型的提示词进行针对性优化
    let optimizedPrompt = prompt;
    
    // 分析提示词内容并添加适当的指令
    if (prompt.includes('如何') || prompt.includes('怎么做')) {
      optimizedPrompt += "\n\n请提供详细的步骤和具体操作方法，并给出实用的建议。";
    } else if (prompt.includes('为什么') || prompt.includes('原因')) {
      optimizedPrompt += "\n\n请解释背后的原因和原理，并提供相关的背景信息。";
    } else if (prompt.includes('比较') || prompt.includes('区别')) {
      optimizedPrompt += "\n\n请从多个维度进行比较分析，指出各自的优缺点。";
    } else {
      // 通用优化
      const randomEnhance = enhancePatterns[Math.floor(Math.random() * enhancePatterns.length)];
      optimizedPrompt += `\n\n${randomEnhance}，并提供全面的分析。`;
    }
    
    // 添加系统指令
    optimizedPrompt += "\n\n请注意：由于API服务当前不可用，这是基于本地规则的提示词优化结果。";
    
    console.log('本地优化结果:', optimizedPrompt);
    
    return {
      success: true,
      data: {
        originalPrompt: prompt,
        optimizedPrompt: optimizedPrompt,
        optimizationNotes: '本地智能优化 (API不可用时的降级方案)',
        model: '本地智能优化引擎',
        generationTime: 0.5,
        parameters: {
          prompt,
          options,
          isLocalOptimization: true
        }
      }
    };
  }

  // 统一调用接口
  async generateImage(modelName, prompt, referenceImages = [], options = {}) {
    try {
      // 记录模型选择信息
      const normalizedModelName = modelName.toLowerCase().trim();
      console.log('🎯 模型选择:', {
        原始名称: modelName,
        标准化后: normalizedModelName,
        参考图像数量: referenceImages.length
      });

      // 如果有参考图像，转换为Base64
      const processedImages = [];
      for (const img of referenceImages) {
        if (img.startsWith('blob:')) {
          const base64 = await this.imageToBase64(img);
          processedImages.push(base64);
        } else {
          processedImages.push(img);
        }
      }

      // 根据模型名称调用不同的API，严格匹配，不进行降级
      switch (normalizedModelName) {
        case 'nano banana':
        case 'nano banana pro':
          console.log('✅ 调用 Nano Banana 模型 (Gemini 2.5 Flash Image)');
          return await this.callNanoBanana(prompt, processedImages, options);
        
        case 'gpt-5 image':
          console.log('✅ 调用 GPT-5 Image 模型');
          return await this.callGpt5Image(prompt, processedImages, options);
        
        case 'gpt-5 image mini':
          console.log('✅ 调用 GPT-5 Image Mini 模型');
          return await this.callGpt5ImageMini(prompt, processedImages, options);
        
        case 'seedream':
        case 'seedream-4':
        case 'seadream': // 兼容旧拼写
        case 'seedran-4': // 兼容旧拼写
          console.log('✅ 调用 SeeDream-4 模型 (火山引擎 Doubao-SeeDream-4.0)');
          return await this.callSeaDream(prompt, processedImages, options);
        
        default:
          console.error('❌ 不支持的模型:', modelName);
          throw new Error(`不支持的模型: ${modelName}`);
      }
    } catch (error) {
      console.error('图像生成失败:', error);
      throw error;
    }
  }
}

export default new ModelAPIService();
