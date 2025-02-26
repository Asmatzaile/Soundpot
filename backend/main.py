import os
import io

import json
import logging
from datetime import datetime
import uvicorn
from contextlib import asynccontextmanager

from pydub import AudioSegment

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import model_controller as model

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:\t%(message)s')

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.debug(f"Loading library metadata...")
    load_library_metadata()
    save_library_metadata()
    logging.info(f"Library metadata loaded.")

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

sounds_folder_path = './library'
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
    await model.interpolate_sounds(sounds_folder_path+"/"+filename1, sounds_folder_path+"/"+filename2, sounds_folder_path+"/"+output_filename)
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

if __name__ == "__main__":
    with open('../config.json') as f:
        config = json.load(f)
    uvicorn.run("main:app", host="0.0.0.0", port=config["backend_port"])
