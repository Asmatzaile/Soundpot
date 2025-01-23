export const getLibraryData = async () => {
    while(true) {
        try {
            const response = await fetch("/api/library/");
            if (response.ok) return await response.json();
            throw new Error('Response was not ok');
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 500)); // check every 500 ms
        }
    }
}

export const getMergedSoundsData = async (filename1, filename2) => {
    const formData = new FormData();
    formData.append("filename1", filename1);
    formData.append("filename2", filename2);
    const response = await fetch("/api/merge/", {
        method: "POST",
        body: formData,
    })
    return await response.json();
}
