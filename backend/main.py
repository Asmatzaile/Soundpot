import os
import io
from pathlib import Path
import json
import logging
from datetime import datetime
import uvicorn
from contextlib import asynccontextmanager

from pydub import AudioSegment

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from stable_audio_tools.models.factory import create_model_from_config
from stable_audio_tools.models.utils import load_ckpt_state_dict
from stable_audio_tools.training.utils import copy_state_dict

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:\t%(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.debug(f"Loading library metadata...")
    load_library_metadata()
    save_library_metadata()
    logging.info(f"Library metadata loaded.")

    logging.debug("Loading model...")
    load_model()
    logging.info(f"Model loaded. Tensor computations will run on the device {DEVICE}.")

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL = None
SAMPLE_RATE = 44100


def load_model():
    global MODEL
    if MODEL is None:
        config_path = Path("vae_config.json")
        checkpoint_path = Path("vae.ckpt")
        with config_path.open() as f:
            config = json.load(f)
        vae = create_model_from_config(config)
        copy_state_dict(vae, load_ckpt_state_dict(str(checkpoint_path)))
        MODEL = vae.to(DEVICE).eval().requires_grad_(False)
    return MODEL


@torch.no_grad()
def process_audio(tensor):
    model = load_model()
    encoded = model.encode(tensor)
    return encoded


async def read_audio(file: UploadFile) -> torch.Tensor:
    content = await file.read()
    buffer = io.BytesIO(content)
    tensor, sr = torchaudio.load(buffer)
    if sr != SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(sr, SAMPLE_RATE)
        tensor = resampler(tensor)
    return tensor.to(DEVICE)

async def get_tensor_of_audio(path) -> torch.Tensor:
    try:
        tensor, sr = torchaudio.load(path)
    except RuntimeError:
        raise Exception(f"File {path} not found")
    if sr != SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(sr, SAMPLE_RATE)
        tensor = resampler(tensor)
    return tensor.to(DEVICE)

def vector_lerp(vec1, vec2, t):
    return (1 - t) * vec1 + t * vec2


def scale_transform(vec, factor):
    return vec * factor


def rotate_transform(vec, factor):
    angle = factor * np.pi
    cos, sin = np.cos(angle), np.sin(angle)
    rotation_matrix = torch.tensor(
        [[cos, -sin], [sin, cos]], device=vec.device, dtype=torch.float32
    )
    orig_shape = vec.shape
    vec_2d = vec.reshape(-1, 2)
    rotated = torch.matmul(vec_2d, rotation_matrix)
    return rotated.reshape(orig_shape)


def nonlinear_transform(vec, factor):
    return torch.tanh(vec * (1 + factor))


class TransformParams(BaseModel):
    scale: float
    rotate: float
    nonlinear: float
    scale_active: bool
    rotate_active: bool
    nonlinear_active: bool


@app.post("/interpolate/")
async def interpolate_audio(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    x: float = Form(...),
    transforms: str = Form(...),
):
    try:
        transform_params = TransformParams.parse_raw(transforms)

        # Read and process audio files
        tensor1 = await read_audio(file1)
        tensor2 = await read_audio(file2)

        # Ensure both audio samples are the same length
        min_length = min(tensor1.shape[1], tensor2.shape[1])
        tensor1 = tensor1[:, :min_length]
        tensor2 = tensor2[:, :min_length]

        # Encode audio
        encoded1 = process_audio(tensor1.unsqueeze(0))
        encoded2 = process_audio(tensor2.unsqueeze(0))

        # Apply weighted average
        interpolated = weighted_average(encoded1, encoded2, x)

        # Apply transformations
        if transform_params.scale_active:
            interpolated = scale_transform(interpolated, transform_params.scale)
        if transform_params.rotate_active:
            interpolated = rotate_transform(interpolated, transform_params.rotate)
        if transform_params.nonlinear_active:
            interpolated = nonlinear_transform(interpolated, transform_params.nonlinear)

        # Decode
        model = load_model()
        decoded = model.decode(interpolated)

        # Convert to audio file
        decoded = decoded.squeeze(0).cpu()
        buffer = io.BytesIO()
        torchaudio.save(buffer, decoded, SAMPLE_RATE, format="wav")
        buffer.seek(0)

        return StreamingResponse(buffer, media_type="audio/wav")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

sounds_folder_path = '../library'
LIBRARY_METADATA = None

app.mount("/library/", StaticFiles(directory=sounds_folder_path)) # special characters on the filename need to addressed by the client in their requests request

@app.get("/library_metadata/")
async def serve_library_metadata():
    return load_library_metadata()

def load_library_metadata():
    global LIBRARY_METADATA
    if LIBRARY_METADATA is not None: return LIBRARY_METADATA
    os.makedirs(sounds_folder_path, exist_ok=True) # make the folder if it doesn't exist
    try:
        with open(f"{sounds_folder_path}/.metadata.json") as f:
            LIBRARY_METADATA = json.load(f)
    except:
        pass
    found_sounds = []
    for filename in os.listdir(sounds_folder_path):
        if filename == ".metadata.json": continue # skip the metadata file
        if not filename.endswith(".wav"):
            logging.warning(f"File {filename} on sounds library folder was not recognized!")
            continue
        found_sounds.append(filename)
        if filename not in LIBRARY_METADATA:
            LIBRARY_METADATA[filename] = {'origin': 'primordial', 'date': datetime.now().isoformat(timespec="seconds")}
    
    for filename in list(LIBRARY_METADATA):
        if filename in found_sounds: continue
        logging.warning(f"File \"{filename}\" not found! Removing from library metadata.")
        LIBRARY_METADATA.pop(filename)

    return LIBRARY_METADATA

def save_library_metadata():
    with open(f"{sounds_folder_path}/.metadata.json", "w", encoding="utf-8") as f:
        json.dump(LIBRARY_METADATA, f, ensure_ascii=False, indent=4)

def get_new_sound_name():
    candidate_filename_base = f"sound{len(LIBRARY_METADATA)}"
    candidate_filename = f"{candidate_filename_base}.wav"
    if candidate_filename not in LIBRARY_METADATA: return candidate_filename
    retries = 1
    while (True):
        candidate_filename = f"{candidate_filename_base}({retries}).wav"
        if candidate_filename not in LIBRARY_METADATA: return candidate_filename
        retries += 1

@app.post("/merge/")
async def merge_sounds(filename1 : str = Form(...), filename2 : str = Form(...)):
    output_filename = get_new_sound_name()
    LIBRARY_METADATA[output_filename] = "creating..."
    logging.info(f"Merging sounds {filename1} and {filename2} into {output_filename}")
    await interpolate_sounds(sounds_folder_path+"/"+filename1, sounds_folder_path+"/"+filename2, sounds_folder_path+"/"+output_filename)
    soundMetadata = {'origin': 'merge', 'parents': [filename1, filename2], 'date': datetime.now().isoformat(timespec="seconds")}
    LIBRARY_METADATA[output_filename] = soundMetadata
    save_library_metadata()
    return [output_filename, soundMetadata]

@app.post("/upload_recording/")
async def add_recording(recording = File(...)):
    filename = get_new_sound_name()
    content = await recording.read()
    buffer = io.BytesIO(content)
    audio = AudioSegment.from_file(buffer)
    audio.export(sounds_folder_path+"/"+filename, format="wav")
    soundMetadata = {'origin': 'recording', 'date': datetime.now().isoformat(timespec="seconds")}
    LIBRARY_METADATA[filename] = soundMetadata
    save_library_metadata()
    return [filename, soundMetadata]

async def interpolate_sounds(path1, path2, output_path):
    tensor1 = await get_tensor_of_audio(path1)
    tensor2 = await get_tensor_of_audio(path2)

    # Ensure both audio files are the same length
    min_length = min(tensor1.shape[1], tensor2.shape[1])
    tensor1 = tensor1[:, :min_length]
    tensor2 = tensor2[:, :min_length]

    # Encode audio
    encoded1 = process_audio(tensor1.unsqueeze(0))
    encoded2 = process_audio(tensor2.unsqueeze(0))

    # Interpolate
    interpolated = vector_lerp(encoded1, encoded2, 0.5)
    
    # Decode
    model = load_model()
    decoded = model.decode(interpolated)

    # Convert to audio file
    decoded = decoded.squeeze(0).cpu()
    torchaudio.save(output_path, decoded, SAMPLE_RATE, format="wav") # restating fromat just in case

if __name__ == "__main__":
    with open('../config.json') as f:
        config = json.load(f)
    uvicorn.run("main:app", host="0.0.0.0", port=config["backend_port"], reload=True)
