# Open Source Fonts

source for [@OpenSourceFonts](https://twitter.com/OpenSourceFonts) twitter bot

## Updating

1. run `npm i` to install and update fonts from google
2. run `npm start` to test + update font previews
   - optionally run `npm run bake-errors` to manually exclude fonts which errored out in the future
3. commit + push preview updates
4. copy [`./output/_output.json`](./output/_output.json) into [CBDQ](https://cheapbotsdonequick.com/)
5. update bio with new snapshot date

## Sources of error

- No `.pb` file: some fonts in the repo simply don't have metadata included in their folder
- "Failed to load specimen metadata": some fonts in the repo have since been removed from the site (sometimes in favour of a new, separate version) or have not yet been added to the site (e.g. those only available on https://fonts.google.com/earlyaccess)
- "Failed canvas draw test": could be the font failing to register, or not actually including the glyphs it claims to
