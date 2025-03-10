# Soundpot

Soundpot is a playful and accessible musical framework where users can play and combine distinct sound objects.

## Using Soundpot

At the start, you have a limited library of a few few 'primordial' sound objects. You can drag those objects to the pot, which fulfills a double function: it is both a graphic score and a workspace for combining the objects.

While in the pot:
- To combine two sound objects, just drag one onto the other.
- Hear the sound of your objects when the waves created by raindrops touch them.

## Inspiration

- The concept of [Sound Object](https://monoskop.org/images/0/01/Chion_Michel_Guide_To_Sound_Objects_Pierre_Schaeffer_and_Musical_Research.pdf), coined by Pierre Schaeffer in 1966.
- [Alchemy](https://archive.org/details/msdos_Alchemy_Game_The_1997) by Christian Steinruecken (1997)[^1]
- [Infinite Craft](https://neal.fun/infinite-craft/) by Neal Agarwal (2024)
- An explanation about generating music with agents where one of them emits waves and others play a sound when they receive them. I remember reading it in the past but I can't find it now :(

[^1]: The game I knew before starting this project was a 2010 version named [Little Alchemy](https://littlealchemy.com/). Another popular version, released some months before Little Alchemy, is [Doodle God](https://store.steampowered.com/app/348360/Doodle_God/) by JoyBits.

## Running locally

> [!IMPORTANT]
> If you are using Windows, you'll need [Powershell 7](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows) so that the following commands work properly.
> Alternatively, you could run Linux from within your PC using [WSL2](https://learn.microsoft.com/windows/wsl/install).

### Installation

#### Requirements

- [Node.js](https://nodejs.org/en)
- [conda](https://anaconda.org/anaconda/conda)
- [FFmpeg](https://www.ffmpeg.org)
- [sox](https://sourceforge.net/projects/sox/)

#### Step 1: Install dependencies

Run the following:

```sh
npm install
```

> [!NOTE]
> If you know what you are doing, and are using different devices for frontend and backend, you can selectively install the parts:
> ```sh
> npm run install:frontend
> npm run install:backend
> ```

#### Step 2: Get the Stable Audio Open variational autoencoder

Go to the [Hugging Face repository of Stable Audio Open](https://huggingface.co/stabilityai/stable-audio-open-1.0) and accept the conditions. Sign up if you don't have an account.

Then, [generate an Hugging Face access token](https://huggingface.co/settings/tokens/new?tokenType=read). Give a descriptive name and copy it (starts with `hf_...`).

Lastly, run the following command, replacing `<HF_TOKEN>` with your token:

```sh
npm run get_vae -- --token=<HF_TOKEN>
```

#### Step 3: Add the Freesound token

Go to [Freesound](https://freesound.org/) and log in, or sign up if you don't have an account.

Then, [generate a Freesound API credential](https://freesound.org/apiv2/apply) for `Soundpot`.

Last, navigate to the `frontend` directory of this repository and create a file named `.env.local`. There, put your api key under the name `VITE_FREESOUND_KEY`.

```shell
VITE_FREESOUND_KEY=YOUR_API_KEY
```

### Troubleshooting

#### Libsox

```sh
OSError: libsox.so: cannot open shared object file: No such file or directory
```

Solution:

```sh
sudo apt install libsox-dev
```

### Adding sounds

To add 'primordial sounds' to the application, put them inside the `backend/library` folder.

### Running

```sh
npm start
```

> [!NOTE]
> If you only installed either the frontend or the backend, that will probably not work.
> To run only one of them, you can use one of the following:
> 
> ```sh
> npm run start:frontend
> npm run start:backend
> ```

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3).
See the [LICENSE](./LICENSE) file for details.

As such, all files are licensed under the GPLv3, except for the following files, from which the original code is licensed under the [MIT License](./LICENSE-MIT):
- [backend/model_controller.py](backend/model_controller.py), [backend/utils/tensor_transforms.py](backend/utils/tensor_transforms.py) [The original project](https://github.com/aaronabebe/latent-mixer) claims to use the MIT license but the text is not included. Copyright (c) 2024 Aaron Abebe.
- [backend/vae_config.json](backend/vae_config.json). From [stable-audio-tools](https://github.com/Stability-AI/stable-audio-tools). Copyright (c) 2023 Stability AI.

The changed code for those files is nevertheless licensed under the GPLv3.

Additionally, this project uses [Lucide Icons](https://lucide.dev/), which are licensed under the [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE).
