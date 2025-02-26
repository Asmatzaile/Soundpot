import argparse
import subprocess
from huggingface_hub import whoami
from stable_audio_tools import get_pretrained_model
import torch

parser = argparse.ArgumentParser()
parser.add_argument("--token", type=str)
args = parser.parse_args()
token = args.token

try:
    if (token != None):
        subprocess.run(f"huggingface-cli login --token {token}", shell=True, check=True)
    else:
        print("No token specified. Trying to log in with HF cache.")
        whoami()
        print("Login successful.")
    logged_in = True
except BaseException:
    logged_in = False

if not logged_in:
    details = "Invalid user token." if token != None else "No token found."
    raise Exception("Not logged in. " + details)

# from https://twitter.com/_lyraaaa_/status/1804256808900661562
print("Getting model...")
model, model_config = get_pretrained_model("stabilityai/stable-audio-open-1.0")
print("Saving VAE...")
torch.save({"state_dict": model.pretransform.model.state_dict()}, "vae/vae.ckpt")
print("VAE saved.")
