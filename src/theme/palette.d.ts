type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

declare const palette: {
  bolt: Scale;
  ink: Scale;
  hairline: string;
  success: string;
  danger: string;
  info: string;
};

export = palette;
