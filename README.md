# Open Source Fonts

source for [@OpenSourceFonts](https://twitter.com/OpenSourceFonts) twitter bot

## Updating

1. run `npm i` to install and update fonts from google
2. run `npm start` to test + update font previews
   - optionally run `npm run bake-errors` to manually exclude fonts which errored out in the future
3. commit + push preview updates
4. copy [`./output/_output.json`](./output/_output.json) into [CBDQ](https://cheapbotsdonequick.com/)
5. update bio with new snapshot date
