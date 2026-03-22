"""
视觉风格分析工具
使用 OpenAI Vision API 或兼容接口分析图片风格
"""

import requests
import time
from typing import Dict, Optional


def analyze_image_style(
    image_data: Optional[str] = None,
    image_url: Optional[str] = None,
    api_key: str = None,
    base_url: str = "https://api.openai.com/v1",
    model_name: str = "gpt-4o",
    language: str = "en"
) -> Dict:
    """
    使用 Vision 模型分析图片风格
    
    Args:
        image_data: Base64 编码的图片数据
        image_url: 图片 URL
        api_key: API 密钥
        base_url: API 基础 URL
        model_name: 模型名称
        language: 输出语言 ('zh' 或 'en')
    
    Returns:
        分析结果字典
    """
    if not api_key:
        raise ValueError("API key is required")
    
    if not image_data and not image_url:
        raise ValueError("Either image_data or image_url must be provided")
    
    # 根据语言选择提示词（简化版，合并风格描述字段）
    if language == 'zh':
        prompt_text = """分析图片风格，请使用【中文】进行所有描述。
返回JSON格式（无需markdown标记）：

{
  "style_description": "详细描述视觉风格，包含：构图布局、光线处理、艺术风格、媒介类型、情绪氛围、技术特征、关键元素等（请用中文）",
  "color_description": "描述色彩方案的情绪、对比度、色温、和谐度等特征（请用中文）",
  "color_classification": {
    "primary": "#XXXXXX",
    "secondary": "#XXXXXX",
    "tertiary": "#XXXXXX",
    "neutral": "#XXXXXX"
  },
  "ai_prompt": "Midjourney提示词，请使用【英文关键词】描述，适合作为AI绘图指令",
  "style_tags": "标签1, 标签2, 标签3, 标签4, 标签5（请用中文）",
  "style_name": "风格名称（请用中文）"
}

要求：
1. 请确保除 ai_prompt 外，所有文本内容均为中文。
2. color_classification必须包含4个#XXXXXX格式颜色代码。
3. color_description简洁描述色彩特征。"""
    else:
        prompt_text = """Analyze image style, please use [English] for all descriptions.
Return JSON (no markdown):

{
  "style_description": "Comprehensive style description including: composition, lighting, art style, medium, mood, technical features, key elements (in English)",
  "color_description": "Describe color scheme's mood, contrast, temperature, harmony (in English)",
  "color_classification": {
    "primary": "#XXXXXX",
    "secondary": "#XXXXXX",
    "tertiary": "#XXXXXX",
    "neutral": "#XXXXXX"
  },
  "ai_prompt": "Midjourney prompt, use [English] descriptive keywords",
  "style_tags": "tag1, tag2, tag3, tag4, tag5 (in English)",
  "style_name": "Style Name (in English)"
}

Requirements:
1. Ensure all text content is in English.
2. color_classification must have 4 #XXXXXX colors.
3. color_description briefly describes color characteristics."""
    
    # 构建消息内容
    content = [
        {
            "type": "text",
            "text": prompt_text
        }
    ]
    
    # 添加图片
    if image_url:
        content.append({
            "type": "image_url",
            "image_url": {"url": image_url}
        })
    elif image_data:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
        })
    
    # 调用 API
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": content
            }
        ],
        "max_tokens": 2000,
        "stream": False  # 暂时不使用流式，因为需要完整 JSON
    }
    
    try:
        # 确保 base_url 格式正确
        api_url = base_url.rstrip('/')
        # 如果 base_url 已经包含完整路径，直接使用；否则添加 /chat/completions
        if not api_url.endswith('/chat/completions'):
            api_url = f"{api_url}/chat/completions"
        
        print(f"[DEBUG] Calling API: {api_url}")
        print(f"[DEBUG] Model: {model_name}")
        
        # 重试机制：最多尝试 2 次（减少重试次数）
        max_retries = 2  # 从 3 降低到 2
        retry_delay = 1  # 从 2 秒降低到 1 秒
        
        for attempt in range(max_retries):
            try:
                print(f"[DEBUG] Attempt {attempt + 1}/{max_retries}")
                
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=payload,
                    timeout=60  # 从 120 秒降低到 60 秒
                )
                
                print(f"[DEBUG] Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    analysis_text = result['choices'][0]['message']['content']
                    
                    print(f"[DEBUG] ========== API RESPONSE ==========")
                    print(f"[DEBUG] Response received successfully")
                    print(f"[DEBUG] Analysis text length: {len(analysis_text)}")
                    print(f"[DEBUG] First 1000 characters:")
                    print(analysis_text[:1000])
                    print(f"[DEBUG] ====================================")
                    
                    # 解析分析结果
                    parsed_analysis = parse_analysis(analysis_text)
                    
                    return {
                        'raw_text': analysis_text,
                        'parsed': parsed_analysis,
                        'model': model_name,
                        'success': True
                    }
                else:
                    error_msg = f"API request failed: {response.status_code} - {response.text}"
                    print(f"[ERROR] {error_msg}")
                    
                    # 如果是 4xx 错误，不重试
                    if 400 <= response.status_code < 500:
                        raise Exception(error_msg)
                    
                    # 5xx 错误，重试
                    if attempt < max_retries - 1:
                        print(f"[DEBUG] Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        raise Exception(error_msg)
                        
            except requests.exceptions.Timeout:
                print(f"[ERROR] Request timeout on attempt {attempt + 1}")
                if attempt < max_retries - 1:
                    print(f"[DEBUG] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception("大模型加载超时，请稍后重试或更换模型")
            
            except requests.exceptions.RequestException as e:
                print(f"[ERROR] Request exception: {str(e)}")
                if attempt < max_retries - 1:
                    print(f"[DEBUG] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise Exception(f"API 请求失败: {str(e)}")
    
    except Exception as e:
        raise Exception(f"Vision analysis failed: {str(e)}")


def parse_analysis(text: str) -> Dict:
    """
    解析 Vision 模型返回的分析文本
    只支持 JSON 格式
    """
    import re
    import json
    
    print(f"[DEBUG] ========== PARSING ANALYSIS ==========")
    print(f"[DEBUG] Text length: {len(text)}")
    print(f"[DEBUG] First 500 characters of text:")
    print(text[:500])
    print(f"[DEBUG] =====================================")
    
    if not text or len(text) < 10:
        print("[ERROR] Analysis text is empty or too short!")
        return create_empty_sections()
    
    # 尝试解析 JSON 格式
    json_result = try_parse_json(text)
    if json_result:
        print("[DEBUG] Successfully parsed JSON format")
        return json_result
    
    # 如果 JSON 解析失败，返回空结构
    print("[ERROR] Failed to parse JSON, returning empty structure")
    return create_empty_sections()


def try_parse_json(text: str) -> Dict:
    """
    尝试从文本中提取并解析 JSON
    """
    import json
    import re
    
    # 尝试直接解析整个文本
    try:
        data = json.loads(text)
        return format_json_result(data)
    except json.JSONDecodeError:
        pass
    
    # 尝试提取 JSON 代码块
    json_match = re.search(r'```json\s*\n(.*?)\n```', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(1))
            return format_json_result(data)
        except json.JSONDecodeError:
            pass
    
    # 尝试提取任何 JSON 对象
    json_match = re.search(r'\{[\s\S]*\}', text)
    if json_match:
        try:
            data = json.loads(json_match.group(0))
            return format_json_result(data)
        except json.JSONDecodeError:
            pass
    
    return None


def format_json_result(data: Dict) -> Dict:
    """
    格式化 JSON 结果为标准结构
    """
    # 确保颜色代码是大写
    if 'color_classification' in data and isinstance(data['color_classification'], dict):
        for key in ['primary', 'secondary', 'tertiary', 'neutral']:
            if key in data['color_classification']:
                color = data['color_classification'][key]
                if isinstance(color, str) and color.startswith('#'):
                    data['color_classification'][key] = color.upper()
    
    # 处理新旧格式兼容
    # 如果有 style_description，拆分到各个字段以保持向后兼容
    style_desc = data.get('style_description', '')
    color_desc = data.get('color_description', '')
    
    # 返回扁平结构
    result = {
        'composition': data.get('composition', style_desc),
        'color_palette': data.get('color_palette', color_desc),  # 向后兼容
        'color_description': color_desc,  # 新增：色彩描述
        'color_classification': data.get('color_classification', {}),
        'lighting': data.get('lighting', ''),
        'art_style': data.get('art_style', ''),
        'medium': data.get('medium', ''),
        'mood': data.get('mood', ''),
        'technical': data.get('technical', ''),
        'elements': data.get('elements', ''),
        'style_description': style_desc,  # 完整风格描述
        'ai_prompt': data.get('ai_prompt', ''),
        'style_tags': data.get('style_tags', ''),
        'style_name': data.get('style_name', ''),
        'project_name': data.get('style_name', ''),  # 兼容性
    }
    
    print(f"[DEBUG] Parsed JSON result:")
    print(f"[DEBUG] - Style name: {result['style_name']}")
    print(f"[DEBUG] - Style description length: {len(result['style_description'])}")
    print(f"[DEBUG] - Color description length: {len(result['color_description'])}")
    print(f"[DEBUG] - AI prompt: {result['ai_prompt'][:100] if result['ai_prompt'] else 'None'}")
    print(f"[DEBUG] - Color classification: {result['color_classification']}")
    
    return result


def create_empty_sections() -> Dict:
    """
    创建空的结构
    """
    return {
        'composition': '',
        'color_palette': '',
        'color_description': '',  # 新增：色彩描述
        'color_classification': {'primary': '', 'secondary': '', 'tertiary': '', 'neutral': ''},
        'lighting': '',
        'art_style': '',
        'medium': '',
        'mood': '',
        'technical': '',
        'elements': '',
        'style_description': '',  # 完整风格描述
        'ai_prompt': '',
        'style_tags': '',
        'style_name': '',
        'project_name': ''
    }


def extract_style_tags(analysis: Dict) -> list:
    """
    从分析结果中提取风格标签
    """
    tags = []
    
    # 从 art_style 中提取
    art_style = analysis.get('parsed', {}).get('art_style', '').lower()
    
    style_keywords = [
        'minimalism', 'minimalist', 'brutalism', 'brutalist',
        'surrealism', 'surreal', 'abstract', 'geometric',
        'organic', 'fluid', 'gradient', '3d', 'flat',
        'vintage', 'retro', 'modern', 'contemporary',
        'editorial', 'cinematic', 'ethereal', 'grainy'
    ]
    
    for keyword in style_keywords:
        if keyword in art_style:
            tags.append(keyword.capitalize())
    
    return tags[:6]  # 限制标签数量
