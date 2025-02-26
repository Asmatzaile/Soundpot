import io

import json
import logging
import uvicorn
from contextlib import asynccontextmanager

from pydub import AudioSegment

from fastapi import FastAPI, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import model_controller as model
import library_controller as libctrl

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:\t%(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    libctrl.load(logging)
    model.load(logging)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/library/", StaticFiles(directory=libctrl.LIBRARY_PATH)) # special characters on the filename need to addressed by the client in their requests request

@app.get("/library_metadata/")
async def serve_library_metadata():
    return libctrl.load()

@app.post("/merge/")
async def merge_sounds(filename1 : str = Form(...), filename2 : str = Form(...)):
    [in_path1, in_path2, out_path] = libctrl.reserve_merge(filename1, filename2)
    logging.info(f"Merging sounds {filename1} and {filename2} into {out_path.name}")
    await model.interpolate_sounds(in_path1, in_path2, out_path)
    return confirm_file(out_path.name)

@app.post("/upload_recording/")
async def add_recording(recording = File(...)):
    out_path = libctrl.reserve_recording()
    content = await recording.read()
    buffer = io.BytesIO(content)
    audio = AudioSegment.from_file(buffer)
    audio.export(out_path, format="wav")
    return confirm_file(out_path.name)

def confirm_file(filename):
    metadata = libctrl.confirm_file(filename)
    return [filename, metadata]

if __name__ == "__main__":
    with open('../config.json') as f:
        config = json.load(f)
    uvicorn.run("main:app", host="0.0.0.0", port=config["backend_port"])
