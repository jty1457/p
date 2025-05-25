import os
import subprocess
import tempfile
from flask import Flask, request, jsonify
from google.cloud import storage

app = Flask(__name__)

# Configure Google Cloud Storage client (implicitly uses service account when on Cloud Run)
storage_client = storage.Client()

@app.route('/extract-audio', methods=['POST'])
def extract_audio_route():
    data = request.get_json()
    if not data or 'input_video_gcs_uri' not in data or 'output_audio_gcs_path' not in data:
        return jsonify({"error": "Missing 'input_video_gcs_uri' or 'output_audio_gcs_path' in request body"}), 400

    input_video_gcs_uri = data['input_video_gcs_uri'] # e.g., "gs://your-bucket/videos/input.mp4"
    output_audio_gcs_path = data['output_audio_gcs_path'] # e.g., "translationJobs/job123/extracted_audio.mp3"
    
    # Extract bucket name and file path from GCS URI
    if not input_video_gcs_uri.startswith("gs://"):
        return jsonify({"error": "Invalid GCS URI format for input video."}), 400
    
    try:
        input_bucket_name, input_blob_name = input_video_gcs_uri[5:].split("/", 1)
        # Assumes output_audio_gcs_path is "bucket-name/path/to/file.mp3"
        # If only path is given, need to get bucket from env
        output_parts = output_audio_gcs_path.split("/", 1)
        if len(output_parts) == 2: # "bucket/path"
            output_bucket_name, output_blob_name = output_parts
        else: # "path"
            output_blob_name = output_audio_gcs_path
            output_bucket_name = os.environ.get("GCS_BUCKET_NAME") # Get bucket from env var
            if not output_bucket_name:
                raise ValueError("Output bucket name not found in path or environment variable GCS_BUCKET_NAME.")

    except ValueError as e:
        return jsonify({"error": f"Invalid GCS path format: {e}"}), 400


    with tempfile.TemporaryDirectory() as tmpdir:
        local_video_path = os.path.join(tmpdir, 'input_video') # FFMPEG might need extension, or handle it
        local_audio_path = os.path.join(tmpdir, 'extracted_audio.mp3') # Output format

        try:
            # 1. Download video from GCS
            print(f"Downloading {input_video_gcs_uri} to {local_video_path}...")
            input_bucket = storage_client.bucket(input_bucket_name)
            input_blob = input_bucket.blob(input_blob_name)
            input_blob.download_to_filename(local_video_path)
            print("Video download complete.")

            # 2. Extract audio using FFMPEG
            # -vn: no video, -acodec libmp3lame: mp3 codec, -q:a 2: quality (0-9, lower is better for VBR)
            # or -acodec pcm_s16le for WAV if preferred
            print(f"Extracting audio from {local_video_path} to {local_audio_path}...")
            # Simple command: ffmpeg -i input.mp4 -vn -acodec libmp3lame output.mp3
            # Robust command:
            process = subprocess.run([
                'ffmpeg',
                '-i', local_video_path,
                '-vn',                      # Disable video recording
                '-acodec', 'libmp3lame',   # Use LAME MP3 encoder
                '-q:a', '2',               # VBR quality (0-9, lower is better). 2 is ~190 kbps.
                '-y',                       # Overwrite output files without asking
                local_audio_path
            ], capture_output=True, text=True, check=True)
            print("FFMPEG stdout:", process.stdout)
            print("FFMPEG stderr:", process.stderr) # ffmpeg often logs to stderr
            print("Audio extraction complete.")

            # 3. Upload extracted audio to GCS
            print(f"Uploading {local_audio_path} to gs://{output_bucket_name}/{output_blob_name}...")
            output_bucket = storage_client.bucket(output_bucket_name)
            output_blob = output_bucket.blob(output_blob_name)
            output_blob.upload_from_filename(local_audio_path, content_type='audio/mpeg')
            print("Audio upload complete.")
            
            output_audio_gcs_uri = f"gs://{output_bucket_name}/{output_blob_name}"
            return jsonify({
                "message": "Audio extracted and uploaded successfully.",
                "output_audio_gcs_uri": output_audio_gcs_uri
            }), 200

        except subprocess.CalledProcessError as e:
            print(f"FFMPEG error: {e}")
            print("FFMPEG stdout:", e.stdout)
            print("FFMPEG stderr:", e.stderr)
            return jsonify({"error": "FFMPEG processing failed.", "details": e.stderr}), 500
        except Exception as e:
            print(f"An error occurred: {e}")
            return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500
    
if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
