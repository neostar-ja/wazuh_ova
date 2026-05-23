import '@mui/material';
import '@mui/material/Typography';
import '@mui/material/Box';
import '@mui/material/Chip';
import '@mui/material/TextField';
import '@mui/material/Stack';

declare module '@mui/material' {
  interface GridBaseProps {
    item?: boolean;
    container?: boolean;
    xs?: number | string | boolean;
    sm?: number | string | boolean;
    md?: number | string | boolean;
    lg?: number | string | boolean;
    xl?: number | string | boolean;
    spacing?: number | string | Record<string, any>;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyOwnProps {
    fontWeight?: number | string;
    fontFamily?: string;
    fontSize?: number | string;
    mb?: number | string;
    mt?: number | string;
    ml?: number | string;
    mr?: number | string;
  }
}

declare module '@mui/material/Box' {
  interface BoxOwnProps {
    mt?: number | string;
    mb?: number | string;
    ml?: number | string;
    mr?: number | string;
  }
}

declare module '@mui/material/Chip' {
  interface ChipOwnProps {
    icon?: any;
  }
}

declare module '@mui/material/TextField' {
  interface BaseTextFieldProps {
    InputProps?: any;
    InputLabelProps?: any;
    inputProps?: any;
  }
}

declare module '@mui/material/Stack' {
  interface StackOwnProps {
    flexWrap?: string;
    useFlexGap?: boolean;
  }
}
