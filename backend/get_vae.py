import argparse
import subprocess
from stable_audio_tools import get_pretrained_model
import torch

parser = argparse.ArgumentParser()
parser.add_argument("--token", type=str)
args = parser.parse_args()
token = args.token

if (token != None):
    subprocess.run(f"huggingface-cli login --token {token}", shell=True)
else:
    print("Warning: Hugging Face token not specified, trying to get VAE nevertheless")

# from https://twitter.com/_lyraaaa_/status/1804256808900661562
model, model_config = get_pretrained_model("stabilityai/stable-audio-open-1.0")
torch.save({"state_dict": model.pretransform.model.state_dict()}, "vae.ckpt")
