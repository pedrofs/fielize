import { useEffect, useId, useRef } from "react"

type TrixEditorProps = {
  id?: string
  name?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export function TrixEditor({ id, name, value, onChange, placeholder }: TrixEditorProps) {
  const reactId = useId()
  const inputId = id ?? `trix-input-${reactId.replace(/[:]/g, "")}`
  const editorRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handleChange = () => {
      const input = inputRef.current
      if (input) onChange(input.value)
    }

    editor.addEventListener("trix-change", handleChange)
    return () => {
      editor.removeEventListener("trix-change", handleChange)
    }
  }, [onChange])

  return (
    <div className="trix-editor-wrapper">
      <input
        type="hidden"
        id={inputId}
        name={name}
        value={value}
        ref={inputRef}
        readOnly
      />
      <trix-editor input={inputId} ref={editorRef} placeholder={placeholder} />
    </div>
  )
}
