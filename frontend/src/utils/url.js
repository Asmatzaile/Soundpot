export const addParamsToUrl = (urlString, paramsObject) => {
    const url = new URL(urlString);
    url.search = new URLSearchParams({...Object.fromEntries(url.searchParams.entries()), ...paramsObject});
    return url.toString();    
}

export const getParamsFromUrl = urlString => {
    const url = new URL(urlString);
    return Object.fromEntries(url.searchParams.entries());
}

export const downloadFile = ({file, filename, type}) => {
    const blob = new Blob([file], { type });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);

    link.click();

    URL.revokeObjectURL(url);
}


