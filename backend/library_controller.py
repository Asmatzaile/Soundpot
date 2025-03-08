from pathlib import Path
import os
import json
import logging
from datetime import datetime
from enum import Enum

LIBRARY_PATH = Path('./library')
LIBRARY_METADATA = None
METADATA_PATH = LIBRARY_PATH / ".metadata.json"

class Origin(str, Enum):
    MERGE = "merge"
    RECORDING = "recording"
    FREESOUND = "freesound"

def load(extra_logging=None, save_after_load=True):
    global LIBRARY_METADATA
    if LIBRARY_METADATA is not None: return LIBRARY_METADATA
    global logging
    if extra_logging:
        logging = extra_logging
        extra_logging.debug(f"Loading library metadata...")
    os.makedirs(LIBRARY_PATH, exist_ok=True) # make the folder if it doesn't exist
    try:
        with open(METADATA_PATH) as f:
            LIBRARY_METADATA = json.load(f)
    except:
        LIBRARY_METADATA = {}
    found_sounds = []
    for filename in os.listdir(LIBRARY_PATH):
        if filename == METADATA_PATH.name: continue # skip the metadata file
        if not filename.endswith(".wav"):
            logging.warning(f"File {filename} on sounds library folder was not recognized!")
            continue
        found_sounds.append(filename)
        if filename not in LIBRARY_METADATA:
            LIBRARY_METADATA[filename] = {'origin': 'primordial', 'date': get_date()}

    for filename in list(LIBRARY_METADATA):
        if filename in found_sounds: continue
        logging.warning(f"File \"{filename}\" not found! Removing from library metadata.")
        LIBRARY_METADATA.pop(filename)

    if extra_logging: extra_logging.info(f"Library metadata loaded.")
    if save_after_load: save()
    return LIBRARY_METADATA

def save():
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(LIBRARY_METADATA, f, ensure_ascii=False, indent=4)

def get_new_filename(proposal=None):
    candidate_filename_base = Path(proposal).stem if proposal else f"sound{len(LIBRARY_METADATA)}"
    candidate_filename = f"{candidate_filename_base}.wav"
    if candidate_filename not in LIBRARY_METADATA: return candidate_filename
    retries = 1
    while (True):
        candidate_filename = f"{candidate_filename_base}({retries}).wav"
        if candidate_filename not in LIBRARY_METADATA: return candidate_filename
        retries += 1

# must be confirmed with confirm_file
def reserve_merge(parentname1, parentname2):
    filename = get_new_filename()
    soundMetadata = {'origin': Origin.MERGE, 'parents': [parentname1, parentname2]}
    LIBRARY_METADATA[filename] = soundMetadata
    save()
    return [get_path(parentname1), get_path(parentname2), get_path(filename)]

# must be confirmed with confirm_file
def reserve_file(metadata):
    origin = metadata['origin']
    if origin not in Origin._value2member_map_:
        raise TypeError(f"Unknown origin: {origin}")
    original_name = metadata.pop('name', None)
    if original_name: metadata['original_name'] = original_name
    filename = get_new_filename(original_name)
    LIBRARY_METADATA[filename] = metadata
    save()
    return get_path(filename)

def confirm_file(filename):
    LIBRARY_METADATA[filename]['date'] = get_date()
    save()
    return LIBRARY_METADATA[filename]

# To use if a file reserved with reserve_file went wrong
def reject_file(filename):
    delete_sound(filename)

def delete_sound(filename):
    get_path(filename).unlink(missing_ok=True)
    LIBRARY_METADATA.pop(filename)
    save()

def get_path(filename) -> Path:
    return LIBRARY_PATH / filename

def get_date():
    return datetime.now().isoformat(timespec="seconds")
