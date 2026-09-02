import urllib.request
import json
import time
import urllib.error

url = 'https://dharshan8197-medsync-ai.hf.space/api/v1/predict'
models = ['bone', 'brain', 'kidney', 'skin']
results = {}

with open(r'c:\IMP PROJECTS\Medsync\apps\backend\test_face.jpg', 'rb') as f:
    img_bytes = f.read()

for model in models:
    print(f'Testing {model}...')
    start_time = time.time()
    
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    body = (
        b'--' + boundary.encode() + b'\r\n' +
        b'Content-Disposition: form-data; name="scan_type"\r\n\r\n' +
        model.encode() + b'\r\n' +
        b'--' + boundary.encode() + b'\r\n' +
        b'Content-Disposition: form-data; name="file"; filename="dummy.jpg"\r\n' +
        b'Content-Type: image/jpeg\r\n\r\n' +
        img_bytes + b'\r\n' +
        b'--' + boundary.encode() + b'--\r\n'
    )
    
    req = urllib.request.Request(url, data=body, headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'User-Agent': 'Mozilla/5.0'
    })
    
    try:
        with urllib.request.urlopen(req, timeout=300) as response:
            res_body = response.read().decode('utf-8')
            elapsed = time.time() - start_time
            print(f'{model} - Status: {response.status} - Time: {elapsed:.2f}s')
            try:
                res_json = json.loads(res_body)
                print(f'{model} - Response: {json.dumps(res_json, indent=2)}')
                results[model] = {'status': response.status, 'time': elapsed, 'response': res_json}
            except Exception as e:
                print(f'{model} - JSON Parse Error: {e}')
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        elapsed = time.time() - start_time
        print(f'{model} - HTTP Error: {e.code} - Time: {elapsed:.2f}s')
        print(f'{model} - Body: {res_body}')
        results[model] = {'status': e.code, 'time': elapsed, 'error': res_body}
    except Exception as e:
        print(f'{model} - Error: {e}')
        results[model] = {'error': str(e)}

with open('hf_test_results.json', 'w') as f:
    json.dump(results, f, indent=2)
