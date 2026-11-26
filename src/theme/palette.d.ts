type Scale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

declare const palette: {
  bolt: { 500: string };
  inkDark: Scale;
  inkLight: Scale;
  brand: string;
  hairlineDark: string;
  hairlineLight: string;
  onBolt: string;
  success: string;
  danger: string;
  info: string;
};

export = palette;
