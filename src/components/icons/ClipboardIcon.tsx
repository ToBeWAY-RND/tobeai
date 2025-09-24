import { JSX } from 'solid-js/jsx-runtime';
const defaultButtonColor = '#3B81F6';
export const ClipboardIcon = (props: JSX.SvgSVGAttributes<SVGSVGElement>) => (
  // <svg
  //   xmlns="http://www.w3.org/2000/svg"
  //   class="icon icon-tabler icon-tabler-refresh w-4 h-4"
  //   width="24"
  //   height="24"
  //   viewBox="0 0 24 24"
  //   fill="none"
  //   stroke={props.color ?? defaultButtonColor}
  //   stroke-width="2"
  //   stroke-linecap="round"
  //   stroke-linejoin="round"
  // >
  //   <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
  //   <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  // </svg>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_886_19270)">
      <path
        d="M10.6673 0.666016H2.66732C1.93398 0.666016 1.33398 1.26602 1.33398 1.99935V11.3327H2.66732V1.99935H10.6673V0.666016ZM12.6673 3.33268H5.33398C4.60065 3.33268 4.00065 3.93268 4.00065 4.66602V13.9993C4.00065 14.7327 4.60065 15.3327 5.33398 15.3327H12.6673C13.4007 15.3327 14.0007 14.7327 14.0007 13.9993V4.66602C14.0007 3.93268 13.4007 3.33268 12.6673 3.33268ZM12.6673 13.9993H5.33398V4.66602H12.6673V13.9993Z"
        fill={props.color ?? defaultButtonColor}
      />
    </g>
    <defs>
      <clipPath id="clip0_886_19270">
        <rect width="16" height="16" fill="white"/>
      </clipPath>
    </defs>
  </svg>

);
