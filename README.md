![logo](https://i.imgur.com/8wnwx4g.png)
## An online Cards Agains Humanity implementation
![main screenshot](https://i.imgur.com/F7gIAzc.png)

This game is an implementation of Cards Against Humanity, much like the popular <i>Pretend You're Xyzzy</i>.

### Main features:
- Beautiful, skeumorphic user interface
- Streamlined UX: create and join games with just a URL
- Self-hosted
- Supports multiple decks (including custom ones)

## Installation
This game is designed to be self-hosted, you need a host computer that others can connect to (usually involves port-forwarding). You can download packaged binaries of the server from the *releases* page. To run it, you **have to** have a deck downloaded to use in the game. Downloaders from CardCast and PTYX are available, and the U.S. deck is also on the releases page.

You also need a configuration file, there is a sample one on the releases page.

Afterwards, you can run the server in the same directory as these, and start the game in your browser.

## Running, building from source
The server can also be started from source, with ts-node. After cloning this repo, run yarn in the `server/` directory, then run `yarn start`.

You can transpile to JS with `yarn tsc` and also package to binaries with `yarn build`. 

## Contributing
You can.