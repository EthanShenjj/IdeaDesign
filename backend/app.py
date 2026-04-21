"""
AI 视觉风格提取与管理平台 - Flask 后端
支持图片分析、色彩提取、AI 模型调用和素材管理
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import requests

# 导入自定义模块
from utils.color_extractor import extract_colors_from_image
from utils.vision_analyzer import analyze_image_style
from utils.prompt_generator import generate_prompt_from_analysis
from utils.web_screenshot import capture_webpage_screenshot
from database import get_database_manager
from database.auth_manager import AuthManager

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# 配置
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 初始化数据库（自动选择合适的数据库类型）
db = get_database_manager()

# 初始化认证管理器
auth_manager = None
def init_auth_manager():
    global auth_manager
    try:
        db = get_database_manager()
        if db and hasattr(db, 'connection') and db.connection:
            db_type = getattr(db, 'db_type', 'sqlite')
            auth_manager = AuthManager(db.connection, db_type)
            print("✓ Auth manager initialized")
            return True
        else:
            print("✗ Database connection not available for auth manager")
    except Exception as e:
        print(f"✗ Failed to initialize auth manager: {e}")
    return False

init_auth_manager()


def allowed_file(filename):
    """检查文件扩展名是否允许"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/uploads/<path:filename>')
def serve_upload(filename):
    """提供上传文件的静态服务"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'message': 'AI Vision Style Extractor API is running',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    """
    图片分析接口 - 核心功能
    接收图片，返回 Vision 模型生成的风格描述
    """
    try:
        # 获取配置参数
        api_key = request.form.get('api_key')
        base_url = request.form.get('base_url', 'https://api.openai.com/v1')
        model_name = request.form.get('model_name', 'gpt-4o')
        language = request.form.get('language', 'en')  # 获取语言参数
        
        print(f"[DEBUG] Received analyze request:")
        print(f"  - API Key: {'*' * 10 if api_key else 'None'}")
        print(f"  - Base URL: {base_url}")
        print(f"  - Model: {model_name}")
        print(f"  - Language: {language}")
        
        if not api_key:
            return jsonify({'error': 'API key is required'}), 400
        
        # 处理图片输入（支持文件上传或 URL）
        image_data = None
        image_url = request.form.get('image_url')
        
        if 'image' in request.files:
            file = request.files['image']
            print(f"[DEBUG] File uploaded: {file.filename}")
            if file and allowed_file(file.filename):
                # 保存文件
                filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                print(f"[DEBUG] File saved to: {filepath}")
                
                # 优化图片：压缩和调整尺寸
                with Image.open(filepath) as img:
                    # 转换为 RGB（如果是 RGBA 或其他格式）
                    if img.mode in ('RGBA', 'LA', 'P'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                        img = background
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')
                    
                    # 限制最大尺寸（保持宽高比）- 降低到 800 以加快处理速度
                    max_size = 800  # 从 1024 降低到 800
                    if max(img.size) > max_size:
                        ratio = max_size / max(img.size)
                        new_size = tuple(int(dim * ratio) for dim in img.size)
                        img = img.resize(new_size, Image.Resampling.LANCZOS)
                        print(f"[DEBUG] Image resized to: {new_size}")
                    
                    # 保存为优化的 JPEG - 降低质量以减小文件大小
                    buffer = BytesIO()
                    img.save(buffer, format='JPEG', quality=75, optimize=True)  # 从 85 降低到 75
                    buffer.seek(0)
                    
                    # 编码为 base64
                    image_data = base64.b64encode(buffer.read()).decode('utf-8')
                    print(f"[DEBUG] Image optimized and encoded, length: {len(image_data)}")
            else:
                return jsonify({'error': 'Invalid file type'}), 400
        elif image_url:
            original_image_url = image_url
            print(f"[DEBUG] Processing image URL: {image_url}")
            try:
                # 尝试从 URL 下载图片
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                }
                
                # 设置超时，防止挂起
                resp = requests.get(image_url, headers=headers, timeout=15)
                
                if resp.status_code != 200:
                    return jsonify({'error': f'Failed to download image from URL: {resp.status_code}'}), 400
                
                content_type = resp.headers.get('Content-Type', '')
                print(f"[DEBUG] URL Content-Type: {content_type}")

                # 验证是否为图片内容或是 HTML
                if 'text/html' in content_type:
                    # 网页 URL：使用 Playwright 截图
                    print(f"[DEBUG] URL is a webpage, taking screenshot...")
                    screenshot_data, screenshot_err = capture_webpage_screenshot(image_url)
                    if screenshot_err:
                        print(f"[ERROR] Screenshot failed: {screenshot_err}")
                        return jsonify({'error': f'网页截图失败: {screenshot_err}'}), 400
                    image_data = screenshot_data
                    image_url = None  # 改为使用截图的 base64 数据
                    print(f"[DEBUG] Webpage screenshot captured successfully")
                else:
                    # 直接图片 URL：使用 PIL 验证并处理
                    try:
                        img = Image.open(BytesIO(resp.content))
                        
                        # 同样的优化处理
                        if img.mode in ('RGBA', 'LA', 'P'):
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            mask = img.split()[-1] if img.mode in ('RGBA', 'LA') else None
                            background.paste(img, mask=mask)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        max_size = 1024
                        if max(img.size) > max_size:
                            ratio = max_size / max(img.size)
                            new_size = tuple(int(dim * ratio) for dim in img.size)
                            img = img.resize(new_size, Image.Resampling.LANCZOS)
                        
                        buffer = BytesIO()
                        img.save(buffer, format='JPEG', quality=85, optimize=True)
                        buffer.seek(0)
                        image_data = base64.b64encode(buffer.read()).decode('utf-8')
                        image_url = None # 改为使用 image_data
                        
                    except Exception as img_err:
                        print(f"[ERROR] PIL failed to open image from URL: {str(img_err)}")
                        return jsonify({'error': 'The content at this URL is not a valid image format.'}), 400
                    
            except requests.exceptions.RequestException as req_err:
                print(f"[ERROR] Request failed for URL: {str(req_err)}")
                return jsonify({'error': f'Could not reach the image URL: {str(req_err)}'}), 400
                
            # 将下载或截图得到的 base64 保存为文件，以便前端展示
            if image_data:
                import uuid
                filename = secure_filename(f"url_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.jpg")
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                try:
                    with open(filepath, "wb") as fh:
                        fh.write(base64.b64decode(image_data))
                    saved_image_url = f"/api/uploads/{filename}"
                except Exception as e:
                    print(f"[ERROR] Failed to save URL image to disk: {e}")
        else:
            return jsonify({'error': 'No image provided'}), 400
        
        # 调用 Vision 分析
        print(f"[DEBUG] Calling vision analyzer...")
        analysis_result = analyze_image_style(
            image_data=image_data,
            image_url=image_url,
            api_key=api_key,
            base_url=base_url,
            model_name=model_name,
            language=language  # 传递语言参数
        )
        
        print(f"[DEBUG] Analysis completed successfully")
        print(f"[DEBUG] Color classification result: {analysis_result.get('parsed', {}).get('color_classification')}")
        
        # 返回结果，包含图片路径
        response_data = {
            'success': True,
            'analysis': analysis_result,
            'timestamp': datetime.now().isoformat()
        }
        
        # 如果是上传的文件，返回文件路径
        if 'image' in request.files and filepath:
            response_data['image_url'] = f"/api/uploads/{filename}"
        elif 'original_image_url' in locals() and original_image_url:
            response_data['image_url'] = saved_image_url if 'saved_image_url' in locals() else original_image_url
            response_data['source_url'] = original_image_url
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[ERROR] Analysis failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/extract-colors', methods=['POST'])
def extract_colors():
    """
    颜色提取接口
    接收图片，使用 Python 提取主色调
    """
    try:
        image = None
        
        # 处理文件上传
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                image = Image.open(file.stream)
        
        # 处理 URL
        elif 'image_url' in request.form:
            image_url = request.form['image_url']
            response = requests.get(image_url)
            image = Image.open(BytesIO(response.content))
        
        # 处理 base64
        elif 'image_base64' in request.form:
            image_data = base64.b64decode(request.form['image_base64'])
            image = Image.open(BytesIO(image_data))
        
        if not image:
            return jsonify({'error': 'No valid image provided'}), 400
        
        # 提取颜色
        colors = extract_colors_from_image(image, num_colors=8)
        
        return jsonify({
            'success': True,
            'colors': colors,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate', methods=['POST'])
def generate_image():
    """
    AI 生图接口
    转发 Prompt 到用户自定义的 OpenAI 兼容接口
    """
    try:
        data = request.json
        
        api_key = data.get('api_key')
        base_url = data.get('base_url', 'https://api.openai.com/v1')
        model_name = data.get('model_name', 'dall-e-3')
        prompt = data.get('prompt')
        
        if not all([api_key, prompt]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # 调用图像生成 API
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'model': model_name,
            'prompt': prompt,
            'n': data.get('n', 1),
            'size': data.get('size', '1024x1024'),
            'quality': data.get('quality', 'standard')
        }
        
        response = requests.post(
            f"{base_url}/images/generations",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'result': response.json(),
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'error': 'Generation failed',
                'details': response.text
            }), response.status_code
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/assets', methods=['GET', 'POST', 'DELETE'])
def manage_assets():
    """
    素材管理接口（仅收藏的素材）
    GET: 获取所有素材或按条件筛选
    POST: 保存新素材
    DELETE: 删除素材
    """
    try:
        if request.method == 'GET':
            # 获取查询参数
            asset_id = request.args.get('id')
            tag = request.args.get('tag')
            search = request.args.get('search')
            color = request.args.get('color')
            
            # 如果提供了 ID，返回单个素材
            if asset_id:
                try:
                    asset_id = int(asset_id)  # 转换为整数
                except ValueError:
                    return jsonify({'error': 'Invalid asset ID'}), 400
                
                asset = db.get_asset_by_id(asset_id)
                if asset:
                    return jsonify({
                        'success': True,
                        'asset': asset
                    })
                else:
                    return jsonify({'error': 'Asset not found'}), 404
            
            # 否则返回所有素材
            assets = db.get_assets(tag=tag, search=search, color=color)
            return jsonify({
                'success': True,
                'assets': assets,
                'count': len(assets)
            })
        
        elif request.method == 'POST':
            data = request.json
            
            # 验证必需字段
            required_fields = ['title', 'image_url', 'prompt', 'colors']
            if not all(field in data for field in required_fields):
                return jsonify({'error': 'Missing required fields'}), 400
            
            # 保存素材
            asset_id = db.save_asset(
                title=data['title'],
                image_url=data['image_url'],
                prompt=data['prompt'],
                colors=data['colors'],
                tags=data.get('tags', []),
                analysis=data.get('analysis', {})
            )
            
            return jsonify({
                'success': True,
                'asset_id': asset_id,
                'message': 'Asset saved successfully'
            }), 201
        
        elif request.method == 'DELETE':
            asset_id = request.args.get('id')
            if not asset_id:
                return jsonify({'error': 'Asset ID required'}), 400
            
            try:
                asset_id = int(asset_id)  # 转换为整数
            except ValueError:
                return jsonify({'error': 'Invalid asset ID'}), 400
            
            db.delete_asset(asset_id)
            return jsonify({
                'success': True,
                'message': 'Asset deleted successfully'
            })
    
    except Exception as e:
        print(f"[ERROR] Asset management failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history', methods=['GET', 'POST', 'DELETE'])
def manage_history():
    """
    历史记录管理接口
    GET: 获取历史记录
    POST: 保存新的历史记录
    DELETE: 删除历史记录
    """
    try:
        if request.method == 'GET':
            # 获取查询参数
            history_id = request.args.get('id')
            tag = request.args.get('tag')
            search = request.args.get('search')
            limit = int(request.args.get('limit', 100))
            
            # 如果提供了 ID，返回单个历史记录
            if history_id:
                print(f"🔍 Fetching history by ID: {history_id} (type: {type(history_id)})")
                try:
                    history_id = int(history_id)
                except ValueError:
                    return jsonify({'error': 'Invalid history ID'}), 400
                
                history = db.get_history_by_id(history_id)
                print(f"📊 Search result: {'Found' if history else 'Not Found'}")
                
                if history:
                    return jsonify({
                        'success': True,
                        'history': history
                    })
                else:
                    return jsonify({'error': 'History not found'}), 404
            
            # 否则返回所有历史记录
            print(f"📊 Querying history from DB... (tag={tag}, search={search})")
            history = db.get_history(tag=tag, search=search, limit=limit)
            print(f"✓ History fetched: {len(history)} items")
            return jsonify({
                'success': True,
                'history': history,
                'count': len(history)
            })
        
        elif request.method == 'POST':
            data = request.json
            
            # 验证必需字段
            required_fields = ['title', 'image_url', 'prompt', 'colors']
            if not all(field in data for field in required_fields):
                return jsonify({'error': 'Missing required fields'}), 400
            
            # 保存到历史记录
            history_id = db.save_history(
                title=data['title'],
                image_url=data['image_url'],
                prompt=data['prompt'],
                colors=data['colors'],
                tags=data.get('tags', []),
                analysis=data.get('analysis', {})
            )
            
            return jsonify({
                'success': True,
                'history_id': history_id,
                'message': 'History saved successfully'
            }), 201
        
        elif request.method == 'DELETE':
            history_id = request.args.get('id')
            if not history_id:
                return jsonify({'error': 'History ID required'}), 400
            
            try:
                history_id = int(history_id)
            except ValueError:
                return jsonify({'error': 'Invalid history ID'}), 400
            
            db.delete_history(history_id)
            return jsonify({
                'success': True,
                'message': 'History deleted successfully'
            })
    
    except Exception as e:
        print(f"[ERROR] History management failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<int:history_id>/save', methods=['POST'])
def save_history_to_assets(history_id):
    """
    将历史记录保存到素材库（收藏）
    """
    try:
        asset_id = db.save_history_to_assets(history_id)
        return jsonify({
            'success': True,
            'asset_id': asset_id,
            'message': 'Saved to library successfully'
        })
    except Exception as e:
        print(f"[ERROR] Save to assets failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/history/<int:history_id>/unsave', methods=['POST'])
def remove_from_assets_route(history_id):
    """
    从素材库移除（取消收藏）
    """
    try:
        success = db.remove_from_assets(history_id)
        if success:
            return jsonify({
                'success': True,
                'message': 'Removed from library successfully'
            })
        else:
            return jsonify({'error': 'Failed to remove'}), 500
    except Exception as e:
        print(f"[ERROR] Remove from assets failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    用户注册接口
    """
    try:
        if not auth_manager:
            return jsonify({'error': '认证服务未初始化'}), 500
        
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        success, message, user_info = auth_manager.register(username, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'user': user_info
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
    
    except Exception as e:
        print(f"[ERROR] Registration failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    用户登录接口
    """
    try:
        if not auth_manager:
            return jsonify({'error': '认证服务未初始化'}), 500
        
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': '用户名和密码不能为空'}), 400
        
        success, message, user_info = auth_manager.login(username, password)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'user': user_info
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 401
    
    except Exception as e:
        print(f"[ERROR] Login failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """
    获取用户信息接口
    """
    try:
        if not auth_manager:
            return jsonify({'error': '认证服务未初始化'}), 500
        
        user = auth_manager.get_user_by_id(user_id)
        
        if user:
            return jsonify({
                'success': True,
                'user': user
            })
        else:
            return jsonify({
                'success': False,
                'error': '用户不存在'
            }), 404
    
    except Exception as e:
        print(f"[ERROR] Get user failed: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/compare-models', methods=['POST'])
def compare_models():
    """
    多模型对比接口
    同时调用多个模型生成图片并返回结果
    """
    try:
        data = request.json
        prompt = data.get('prompt')
        models = data.get('models', [])  # [{'name': 'gpt-4o', 'api_key': '...', 'base_url': '...'}]
        
        if not prompt or not models:
            return jsonify({'error': 'Prompt and models are required'}), 400
        
        results = []
        
        for model_config in models:
            try:
                # 调用每个模型
                headers = {
                    'Authorization': f'Bearer {model_config["api_key"]}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'model': model_config['name'],
                    'prompt': prompt,
                    'n': 1,
                    'size': data.get('size', '1024x1024')
                }
                
                response = requests.post(
                    f"{model_config['base_url']}/images/generations",
                    headers=headers,
                    json=payload,
                    timeout=60
                )
                
                if response.status_code == 200:
                    results.append({
                        'model': model_config['name'],
                        'success': True,
                        'result': response.json()
                    })
                else:
                    results.append({
                        'model': model_config['name'],
                        'success': False,
                        'error': response.text
                    })
            
            except Exception as e:
                results.append({
                    'model': model_config['name'],
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/designs', methods=['GET'])
def get_designs():
    """获取所有设计灵感"""
    try:
        data_path = os.path.join(os.path.dirname(__file__), 'data_assets', 'designs.json')
        print(f"📂 Attempting to read designs from: {data_path}")
        
        if not os.path.exists(data_path):
            print(f"✗ Designs file NOT FOUND at: {data_path}")
            return jsonify({'error': 'Designs data not found'}), 404
        
        import json
        with open(data_path, 'r', encoding='utf-8') as f:
            print("📖 Reading JSON file...")
            designs = json.load(f)
            print(f"✓ JSON loaded: {len(designs)} designs")
            
        # 支持分页和搜索
        search = request.args.get('search', '').lower()
        category = request.args.get('category', '')
        
        if search:
            designs = [d for d in designs if search in d.get('name', '').lower() or search in d.get('summary', '').lower()]
            
        if category:
            designs = [d for d in designs if category in [d.get('categoryLabelZh'), d.get('categoryLabelEn')]]
            
        return jsonify({
            'success': True,
            'designs': designs,
            'count': len(designs)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/designs/<slug>', methods=['GET'])
def get_design_by_slug(slug):
    """根据 slug 获取单个设计详情"""
    try:
        data_path = os.path.join(os.path.dirname(__file__), 'data', 'designs.json')
        if not os.path.exists(data_path):
            return jsonify({'error': 'Designs data not found'}), 404
            
        import json
        with open(data_path, 'r', encoding='utf-8') as f:
            designs = json.load(f)
            
        design = next((d for d in designs if d.get('slug') == slug), None)
        
        if design:
            return jsonify({
                'success': True,
                'design': design
            })
        else:
            return jsonify({'error': 'Design not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    # 生产环境关闭 debug 模式
    app.run(host='0.0.0.0', port=port, debug=False)
