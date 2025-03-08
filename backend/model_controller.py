from pathlib import Path
import json

import torch
import torchaudio
from stable_audio_tools.models.factory import create_model_from_config
from stable_audio_tools.models.utils import load_ckpt_state_dict
from stable_audio_tools.training.utils import copy_state_dict
from stable_audio_tools.models.autoencoders import AudioAutoencoder

from utils import tensor_transforms

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL : AudioAutoencoder = None
SAMPLE_RATE = 44100

def load(logging=None):
    global MODEL
    if MODEL is None:
        if logging: logging.debug("Loading model...")
        config_path = Path("vae/vae_config.json")
        checkpoint_path = Path("vae/vae.ckpt")
        with config_path.open() as f:
            config = json.load(f)
        vae = create_model_from_config(config)
        copy_state_dict(vae, load_ckpt_state_dict(str(checkpoint_path)))
        MODEL = vae.to(DEVICE).eval().requires_grad_(False)
        if logging: logging.info(f"Model loaded. Tensor computations will run on the device {DEVICE}.")
    else:
        if logging: logging.info(f"Model already loaded. Tensor computations will run on the device {DEVICE}.")
    return MODEL

async def load_audio(path) -> torch.Tensor:
    try:
        tensor, sr = torchaudio.load(path)
    except RuntimeError:
        raise Exception(f"File {path} not found")

    if sr != SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(sr, SAMPLE_RATE)
        tensor = resampler(tensor)

    # Convert mono to stereo if necessary
    if tensor.shape[0] == 1:
        tensor = tensor.repeat(2, 1)

    return tensor.to(DEVICE)

async def interpolate_sounds(path1, path2, output_path):
    tensor1 = await load_audio(path1)
    tensor2 = await load_audio(path2)

    # Ensure both audio files are the same length
    min_length = min(tensor1.shape[1], tensor2.shape[1])
    tensor1 = tensor1[:, :min_length]
    tensor2 = tensor2[:, :min_length]

    # Interpolate in latent space
    model = load()
    with torch.no_grad():
        encoded1 = model.encode(tensor1.unsqueeze(0)) # get latents
        encoded2 = model.encode(tensor2.unsqueeze(0))
    interpolated = tensor_transforms.lerp(encoded1, encoded2, 0.5)
    decoded = model.decode(interpolated)

    # Convert to audio file
    decoded = decoded.squeeze(0).cpu()
    torchaudio.save(output_path, decoded, SAMPLE_RATE, format="wav") # restating fromat just in case
