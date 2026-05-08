import type { FlashData, SharedProps } from '@/types'
import type { HTMLAttributes } from "react"

declare module '@inertiajs/core' {
  export interface InertiaConfig {
    sharedPageProps: SharedProps
    flashDataType: FlashData
    errorValueType: string[]
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "trix-editor": HTMLAttributes<HTMLElement> & {
        input?: string
        placeholder?: string
        toolbar?: string
        ref?: React.Ref<HTMLElement>
      }
    }
  }
}
