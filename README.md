# Soundpot

Soundpot is a playful and accessible musical framework where users can play and combine distinct sound objects.

## Using Soundpot

At the start, you have a limited library of a few few 'primordial' sound objects. You can drag those objects to the pot, which fulfills a double function: it is both a graphic score and a workspace for combining the objects.

While in the pot:
- To combine two sound objects, just drag one onto the other.
- Hear the sound of your objects when the waves created by raindrops touch them.

## Inspiration

- The concept of [Sound Object](https://monoskop.org/images/0/01/Chion_Michel_Guide_To_Sound_Objects_Pierre_Schaeffer_and_Musical_Research.pdf), coined by Pierre Schaeffer in 1966.
- [Little Alchemy](https://littlealchemy.com/) by Jakub Koziol (2010)[^1]
- [Infinite Craft](https://neal.fun/infinite-craft/) by Neal Agarwal (2024)
- An explanation about generating music with agents where one of them emits waves and others play a sound when they receive them. I remember reading it in the past but I can't find it now :(

[^1]: Although I got to know Little Alchemy first, [Doodle God](https://store.steampowered.com/app/348360/Doodle_God/) by JoyBits was released some months before on 2010.

## Running locally

### Requirements

- [Node.js](https://nodejs.org/en)

### Installation

```sh
npm install && npm run install:frontend
```

### Running

```sh
npm start
```

## License

This project is licensed under the GNU General Public License v3.0 (GPLv3).
See the [LICENSE](./LICENSE) file for details.

As such, all files are licensed under the GPLv3, except for the following files, from which the original code is licensed under the [MIT License](./LICENSE-MIT):
- [backend/main.py](backend/main.py). [The original project](https://github.com/aaronabebe/latent-mixer) claims to use the MIT license but the text is not included. Copyright (c) 2024 Aaron Abebe.
- [backend/vae_config.json](backend/vae_config.json). From [stable-audio-tools](https://github.com/Stability-AI/stable-audio-tools). Copyright (c) 2023 Stability AI.

The changed code for those files is nevertheless licensed under the GPLv3.
