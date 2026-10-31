# EmotiMath demo page

The project page behind the poster's QR code: https://emotimath.github.io/DemoPage/

Plain files, served by GitHub Pages from `main`:

| File            | What it is                                                              |
| --------------- | ----------------------------------------------------------------------- |
| `index.html`  | The page: text, layout, and the live load trace (redrawn by`app.js`)  |
| `style.css`   | All styles, including section snapping and the nav underline            |
| `app.js`      | ~4 KB: the "In action" loop and the nav underline                       |
| `art/*.svg`   | The drawings.`hero.svg` carries its own animation (tablet, butterfly) |
| `art/contribution-fork-tall.svg` | Phones' version of `contribution-fork.svg`: the same parts restacked; redo it when that one changes |
| `favicon.ico` | Tab icon                                                                |

It mirrors the landing page of the app
([EmotiMath/Frontend](https://github.com/EmotiMath/Frontend), `src/screens/LandingScreen.tsx`):
same text, same drawings, same motion. `app.js` is a port of the app's `ReadingsLoop.tsx`
(same readings, same controller rule); without JavaScript the loop shows its first frame.
With Reduce Motion on, everything rests in place, as in the app.

When the app's landing page changes, change these files to match.
