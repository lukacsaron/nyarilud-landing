import localFont from "next/font/local";

export const seasons = localFont({
  src: [
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Light Italic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/The.Seasons/The.Seasons/The Seasons Bold Italic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-display-raw",
  display: "swap",
});

export const drugs = localFont({
  src: [
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Thin.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Thin Italic.otf",
      weight: "100",
      style: "italic",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Light Italic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Bold Italic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../fonts/tt_drugs/TT Drugs Trial Black Italic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-body-raw",
  display: "swap",
});
