from pathlib import Path
import subprocess
import argparse

venv_name = "soundpot"
def conda_run(command):
    subprocess.run(f"conda run --no-capture-output -n {venv_name} {command}", shell=True)

parser = argparse.ArgumentParser()
parser.add_argument("--setup", action="store_true")
parser.add_argument("--get_vae", action="store_true")
parser.add_argument("--token", type=str)
parser.add_argument("--start", action="store_true")

args = parser.parse_args()

if args.setup:
    Path("./library").mkdir(exist_ok=True)
    subprocess.run(f"conda create -n {venv_name} -y", shell=True)
    conda_run("pip install -r requirements.txt")
elif args.get_vae:
    if (args.token is None): conda_run("python3 get_vae.py")
    else: conda_run(f"python3 get_vae.py --token={args.token}")
elif args.start:
    conda_run("python3 main.py")
else:
    raise Exception("No arguments passed to launcher!")
