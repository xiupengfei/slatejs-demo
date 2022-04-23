import { createEditor } from 'slate'
// 导入 Slate 组件和 React 插件。
import { Slate, Editable, withReact } from 'slate-react'
import React, {useMemo, useState} from 'react'

const App = () => {
  const editor = useMemo(() => withReact(createEditor()), [])
  // 当设置 value 状态时，添加初始化值。
  const [value, setValue] = useState([
    {
      type: 'paragraph',
      children: [{ text: '段落中的一行文本。' }],
    },
  ])

  return (
    <Slate editor={editor} value={value} onChange={value => setValue(value)}>
      <Editable />
    </Slate>
  )
}

export default App;
