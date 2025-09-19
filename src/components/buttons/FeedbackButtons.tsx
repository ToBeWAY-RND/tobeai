import { JSX, Show } from 'solid-js';
import { Spinner } from './SendButton';
import { ClipboardIcon, ThumbsDownIcon, ThumbsUpIcon } from '../icons';

type RatingButtonProps = {
  feedbackColor?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  disableIcon?: boolean;
  rating?: string;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

const defaultFeedbackColor = '#3B81F6';

export const CopyToClipboardButton = (props: RatingButtonProps) => {
  return (
    <button
      disabled={props.isDisabled || props.isLoading}
      {...props}
      class={
        'justify-center focus:outline-none flex items-center disabled:opacity-50 disabled:cursor-not-allowed disabled:brightness-100 transition-all filter hover:brightness-90 active:brightness-75 mr-2'
      }
      style={{
        'font-size': '11px', 
        'height': '24px', 
        'border-radius': '4px', 
        'border': '1px solid #CED4DA',
        'padding': '6px'
      }}
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <img 
          class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')}
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAQCAYAAADNo/U5AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAACxSURBVHgB3ZKxDcIwEEXvO66oGCEjMEKYBGiQQoEUOkIBFamACmjNBlkhk5A1KKzjXCAIMoak5Eun033r+X5xINF2fxpRWHW+mFWPQReH85qZNyGCASPtCUnFzlxl6YR+lH4dXExmJBTeWqo3zwAcK3F95d5A1mjPZ2aZpRfflmJ3HAuZKOqgf4Q0R5FR1qIVlM+nFbVUp3iNWHJGV2nxF6ZuXASAIRMPQNz/RNyoV94BdE0ujrYEvSgAAAAASUVORK5CYII=" 
          style={{ 'margin-right': '2px' }}
          title="클립보드로 복사"
        />
        복사
      {/* <ClipboardIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} /> */}
      </Show>
    </button>
  );
};

export const ThumbsUpButton = (props: RatingButtonProps) => {
  const selected = (props.rating === 'THUMBS_UP');
  return (
    <button
      type="submit"
      disabled={props.isLoading || props.isDisabled}
      {...props}
      class={
        'justify-center focus:outline-none flex items-center disabled:cursor-not-allowed transition-all filter hover:brightness-90 active:brightness-75 mr-2'
      }
      style={{
        'font-size': '11px', 
        'height': '24px', 
        'border-radius': '4px', 
        'border': '1px solid #CED4DA',
        'padding': '6px',
        'background-color': selected ? '#5473F9' : '#FFFFFF',
        'color': selected ? '#FFFFFF' : '#000000'
      }}
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <img 
          class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')}
          src={selected 
            ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADaSURBVHgBxZINDcIwEIVbDDAHAwWAA3CAg0nAAg6GgzEFCwomgTqgDjYUlPeyKzQN5WcJ4ZKX27q77653U+rX5pzbQSWUqzGGxAvUQt0zyORNckGvtd7AWWj7MQDJM7g9dJSjHsriOC3B/DANzq9QK9VXEtMJzBCG81NYjUOK7ezvzALyHs6jCAEV1LBt8Y10lboeIWU8A7Zl5a4Gz30imeClGob6egsJW/iCYwGszm7rrwGy2oN6rPa+xkoNP4nfNWXk3UbVM1SfxwCS10GgB+UB0MPq1ID/YzeAuprTgCd05QAAAABJRU5ErkJggg=="
            : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFmSURBVHgBzVJLTsNADLVHJREI2rlBywlIj8ANegPoDqpKkIoNUIkgAd1UpAsKS5IbwAkqbpAjhBN0ECwQnzGe/EBlUQIbLE08suPn5+cB+KPhvB9Oh+MdRGxo0qP+Xvd+Ni/mAaDAXT4On+hkeFEvBXB2frlh/L67vY6AMYO0fgwwGPgNdh4iBRkXJVDIbwzNx/N8WVleqeXBt6fHh4WqPTH3w16nmbIZTwExAIJIg1D93tZtwcCq2UdCvMT5sar21MTJshLKnu9LLo65W4sF3RTwHuTjVVIaKAnphr1LgD6AhldYbHvdtkoAXNf45hdtJlzk8DUsNOBCxWJxF1IMFHluWjxrCRsgh4jiYoQyZpG9lrFWvwIgTY7ZyEGvE5YGGPhXDX4Lo8/VZmvkxDWRbkFCi3hGFhUg4qQiwrhAQHI4Jrn7ah6qZP4YEe6MlAlNLhQJkKjz+iQLK43IgnTwjEsh/Cv7AJwzfZa00ZFIAAAAAElFTkSuQmCC"
          }
          style={{ 'margin-right': '2px' }}
        />
        좋아요
        {/* <ThumbsUpIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} /> */}
      </Show>
    </button>
  );
};

export const ThumbsDownButton = (props: RatingButtonProps) => {
  const selected = (props.rating === 'THUMBS_DOWN');
  return (
    <button
      type="submit"
      disabled={props.isDisabled || props.isLoading }
      {...props}
      class={
        'justify-center focus:outline-none flex items-center disabled:cursor-not-allowed transition-all filter hover:brightness-90 active:brightness-75 mr-2'
      }
      style={{
        'font-size': '11px', 
        'height': '24px', 
        'border-radius': '4px', 
        'border': '1px solid #CED4DA',
        'padding': '6px',
        'background-color': selected ? '#5473F9' : '#FFFFFF',
        'color': selected ? '#FFFFFF' : '#000000'
      }}
    >
      <Show when={!props.isLoading} fallback={<Spinner class="text-white" />}>
        <img 
          class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')}
          src={selected 
            ? "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFwSURBVHgBxVFNTsJQEJ7vgUU2pJ7AcgO8gd7AG0ATNxAW1riRkFATlY2KK9mYGE4gN9AbUG8AN+gWTGac11IklZCwME7Svvfm55tv5iP6b8P6IwwH7n7FqbPAE4ILkhgGsYhMmUxsiN0sl5k/upftWXEdwKmUJgyKAUQpMmxBTdu4RrhGFhAJoItCYawxfwVw+zDsaYLHe47XbZ/N8lT7g2GPCV4naPp6f5Wl32QJBtIQkvNNxdssAbh7fK5rsc6MiHY0k/7EtZQWmH/SjpYAMOAZmCgMgnhTklVHmGtgcW/uXw5FzyyWLlEoYuKGjvKuL5WQ4i/MTyxgvz/wuFR6I6uG7YjFqT1V4qcVg85Fa6Ty+ICMNDK2amRslsU6XvlAc6rZt6Dy9Q8DCxK0rK6JXAAly7TSaieXHec4bPsW8NeIxbwDwjETJTMqo4ZdwTZpkXcoA0+EJ5RK6ul4VdpiJu+4CppTwByRqiLLRf2pfQPd9JQFTTW2XwAAAABJRU5ErkJggg=="
            : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFwSURBVHgBxVFNTsJQEJ7vgUU2pJ7AcgO8gd7AG0ATNxAW1riRkFATlY2KK9mYGE4gN9AbUG8AN+gWTGac11IklZCwME7Svvfm55tv5iP6b8P6IwwH7n7FqbPAE4ILkhgGsYhMmUxsiN0sl5k/upftWXEdwKmUJgyKAUQpMmxBTdu4RrhGFhAJoItCYawxfwVw+zDsaYLHe47XbZ/N8lT7g2GPCV4naPp6f5Wl32QJBtIQkvNNxdssAbh7fK5rsc6MiHY0k/7EtZQWmH/SjpYAMOAZmCgMgnhTklVHmGtgcW/uXw5FzyyWLlEoYuKGjvKuL5WQ4i/MTyxgvz/wuFR6I6uG7YjFqT1V4qcVg85Fa6Ty+ICMNDK2amRslsU6XvlAc6rZt6Dy9Q8DCxK0rK6JXAAly7TSaieXHec4bPsW8NeIxbwDwjETJTMqo4ZdwTZpkXcoA0+EJ5RK6ul4VdpiJu+4CppTwByRqiLLRf2pfQPd9JQFTTW2XwAAAABJRU5ErkJggg=="
          }
          style={{ 'margin-right': '2px' }}
        />
        별로에요
        {/* <ThumbsDownIcon color={props.feedbackColor ?? defaultFeedbackColor} class={'send-icon flex ' + (props.disableIcon ? 'hidden' : '')} /> */}
      </Show>
    </button>
  );
};
