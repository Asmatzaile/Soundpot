export const getLibraryMetadata = async (signal) => {
    while(true) {
        try {
            const response = await fetch("/api/library_metadata/", { signal });
            if (response.ok) return await response.json();
            throw new Error('Response was not ok');
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 500)); // check every 500 ms
        }
    }
}

export const getMergedSoundsMetadata = async (filename1, filename2) => {
    const formData = new FormData();
    formData.append("filename1", filename1);
    formData.append("filename2", filename2);
    const response = await fetch("/api/merge/", {
        method: "POST",
        body: formData,
    })
    if (response.ok) return await response.json();
    return undefined;
}

export const uploadRecording = async (recording) => {
    const recordingData = new FormData();
    recordingData.append("recording", recording);
    const response = await fetch("/api/upload_recording/", {
        method: "POST",
        body: recordingData,
    })
    const soundMetadata = await response.json();
    return soundMetadata;
}
