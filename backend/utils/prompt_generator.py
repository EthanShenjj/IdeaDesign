"""
提示词生成工具
将分析结果转化为 AI 绘图 Prompt
"""

from typing import Dict, List


def generate_prompt_from_analysis(
    analysis: Dict,
    colors: List[Dict],
    style: str = "midjourney",
    include_colors: bool = True
) -> str:
    """
    根据分析结果生成 AI 绘图 Prompt
    
    Args:
        analysis: 视觉分析结果
        colors: 色彩数据
        style: 目标平台 (midjourney, stable-diffusion, dall-e)
        include_colors: 是否包含色彩描述
    
    Returns:
        格式化的 Prompt 字符串
    """
    parsed = analysis.get('parsed', {})
    
    # 提取关键元素
    composition = parsed.get('composition', '').strip()
    art_style = parsed.get('art_style', '').strip()
    medium = parsed.get('medium', '').strip()
    lighting = parsed.get('lighting', '').strip()
    mood = parsed.get('mood', '').strip()
    color_palette = parsed.get('color_palette', '').strip()
    technical = parsed.get('technical', '').strip()
    elements = parsed.get('elements', '').strip()
    
    # 构建 Prompt 部分
    prompt_parts = []
    
    # 主题描述（从 composition 或 elements 提取）
    if composition:
        # 提取完整的构图描述
        comp_sentences = composition.split('.')
        comp_desc = '. '.join([s.strip() for s in comp_sentences[:2] if s.strip()])
        if comp_desc:
            prompt_parts.append(comp_desc)
    
    # 关键视觉元素
    if elements:
        elem_sentences = elements.split('.')
        elem_desc = '. '.join([s.strip() for s in elem_sentences[:2] if s.strip()])
        if elem_desc:
            prompt_parts.append(elem_desc)
    
    # 艺术风格
    if art_style:
        style_sentences = art_style.split('.')
        style_desc = '. '.join([s.strip() for s in style_sentences[:2] if s.strip()])
        if style_desc:
            prompt_parts.append(style_desc)
    
    # 媒介
    if medium:
        medium_sentences = medium.split('.')
        medium_desc = '. '.join([s.strip() for s in medium_sentences[:1] if s.strip()])
        if medium_desc:
            prompt_parts.append(medium_desc)
    
    # 色彩描述
    if color_palette:
        color_sentences = color_palette.split('.')
        color_desc = '. '.join([s.strip() for s in color_sentences[:2] if s.strip()])
        if color_desc:
            prompt_parts.append(color_desc)
    
    # 光照
    if lighting:
        light_sentences = lighting.split('.')
        light_desc = '. '.join([s.strip() for s in light_sentences[:1] if s.strip()])
        if light_desc:
            prompt_parts.append(light_desc)
    
    # 氛围
    if mood:
        mood_sentences = mood.split('.')
        mood_desc = '. '.join([s.strip() for s in mood_sentences[:1] if s.strip()])
        if mood_desc:
            prompt_parts.append(mood_desc)
    
    # 技术细节
    if technical:
        tech_sentences = technical.split('.')
        tech_desc = '. '.join([s.strip() for s in tech_sentences[:1] if s.strip()])
        if tech_desc:
            prompt_parts.append(tech_desc)
    
    # 组合 Prompt
    base_prompt = '. '.join(prompt_parts)
    
    # 如果没有生成任何内容，使用原始文本
    if not base_prompt and analysis.get('raw_text'):
        raw_text = analysis['raw_text'].replace('\n', ' ').strip()
        base_prompt = raw_text[:500]  # 限制长度
    
    # 根据平台添加特定参数
    if style.lower() == "midjourney":
        prompt = f"{base_prompt} --ar 16:9 --v 6.0 --style raw"
    elif style.lower() == "stable-diffusion":
        prompt = f"{base_prompt}, highly detailed, 8k, professional"
    else:
        prompt = base_prompt
    
    return prompt


def get_color_descriptions(colors: List[Dict]) -> List[str]:
    """
    将 HEX 颜色转换为描述性名称
    """
    color_names = []
    
    for color in colors:
        hex_code = color['hex']
        rgb = color.get('rgb', {})
        
        # 简单的颜色命名逻辑
        r, g, b = rgb.get('r', 0), rgb.get('g', 0), rgb.get('b', 0)
        
        # 判断主色调
        if r > 200 and g < 100 and b < 100:
            name = "vibrant red"
        elif r < 100 and g > 200 and b < 100:
            name = "vibrant green"
        elif r < 100 and g < 100 and b > 200:
            name = "deep blue"
        elif r > 200 and g > 200 and b < 100:
            name = "golden yellow"
        elif r > 200 and g < 100 and b > 200:
            name = "magenta"
        elif r < 100 and g > 200 and b > 200:
            name = "cyan"
        elif r > 200 and g > 150 and b < 100:
            name = "warm orange"
        elif r < 50 and g < 50 and b < 50:
            name = "deep black"
        elif r > 200 and g > 200 and b > 200:
            name = "pure white"
        elif r > 150 and g > 150 and b > 150:
            name = "light gray"
        elif r < 100 and g < 100 and b < 100:
            name = "dark gray"
        else:
            # 使用 HEX 值
            name = hex_code
        
        color_names.append(name)
    
    return color_names


def generate_negative_prompt(style: str = "stable-diffusion") -> str:
    """
    生成负面提示词（主要用于 Stable Diffusion）
    """
    if style.lower() == "stable-diffusion":
        return "low quality, blurry, distorted, ugly, bad anatomy, watermark, text, signature"
    return ""


def optimize_prompt_for_platform(prompt: str, platform: str) -> str:
    """
    针对不同平台优化 Prompt
    """
    if platform.lower() == "midjourney":
        # Midjourney 偏好简洁、关键词式的描述
        if "--" not in prompt:
            prompt += " --ar 16:9 --v 6.0"
    
    elif platform.lower() == "stable-diffusion":
        # Stable Diffusion 偏好详细描述
        if "highly detailed" not in prompt.lower():
            prompt += ", highly detailed, professional photography"
    
    elif platform.lower() == "dall-e":
        # DALL-E 偏好自然语言描述
        # 移除特殊参数
        prompt = prompt.split("--")[0].strip()
    
    return prompt
