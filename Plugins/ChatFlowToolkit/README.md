**插件简介**
ChatFlowToolkit 是一个处理对话流输入的工具箱，可以把用户的输入文字和上传的文件分开。
插件包含两个工具：

- **ParseUserInput**：解析对话流的用户输入（USER_INPUT），把文字内容和文件分开。
- **ExtractFiles**：对 ParseUserInput 给出的文件信息进行筛选，比如只要某种类型的文件。

该插件适用于需要处理文件上传的场景，例如让用户发文件并提取文件链接、检查文件类型、整理文件列表等。

该插件已在 GitHub 上开源，如果您在使用过程中遇到任何 Bug，或者有新的功能需求和改进建议，都可以直接在 GitHub 上提交反馈或参与开发，项目地址：https://github.com/SinguJ/open-coze/Plugins/ChatFlowToolkit

**ParseUserInput 工具说明**

- **功能**
  - 从用户输入（USER_INPUT）中分离出文字消息和文件数据。
  - 文件数据会包含很多属性，比如文件名、类型、大小、过期时间等。
- **常见用途**
  - 判断用户有没有上传文件。
  - 获取文件的详细信息，例如大小、扩展名、上传时间等。
- **返回结果说明**
  - HasFile 可以用于快速判断输入中是否有文件。
  - **Type 用于判断文件的类型：**
    - Image：图片
    - Svg：矢量图
    - Audio：音频
    - Video：视频
    - Doc：文档（例如 Word、PDF）
    - PPT：演示文稿
    - Excel：表格
    - Txt：纯文本
    - Code：代码文件（例如 Python、Java）
    - Zip：压缩包（例如 zip、7z、rar）
    - Other：其他类别



**ExtractFiles 工具说明**

- **功能**
  - 从 ParseUserInput 提供的文件列表中，按照条件筛选需要的文件。
  - 支持按文件类型、MIME类型、文件名前缀或后缀、文件名包含内容来过滤。
- **常见用途**
  - 只获取某类文件（例如 PDF 文档、图片）。
  - 获取第一个文件或全部文件的访问地址。
- **按文件类型筛选**
  - 用 FilterByType。
  - 示例：如果只想要文档类文件，传 Doc。
  - 常用取值就是 ParseUserInput 输出的 Type 值之一。
- **按文件名筛选**
  - 用 FilterByName。
  - 支持通配符 *。
    - `test-*`：文件名以 test- 开头。
    - `*.txt`：文件名以 .txt 结尾。
    - `*test*`：文件名里包含 test。
- **按 MIME 类型筛选**
  - 用 FilterByMediaType。
  - MIME 是文件的真实媒体类型，例如 text/plain、application/pdf。
  - 也支持通配符 *。
    - `text/*`：获取所有文本类文件。
    - `*pdf`：获取 MIME 类型里包含 pdf 的文件。
- **一次匹配多个条件**
  - 如果要同时匹配多个类型、多个名字、多个 MIME，可以用 FilterByTypes、FilterByNames、FilterByMediaTypes。
  - 这些参数需要传多个值，例如同时要 Doc 和 PPT 文件，就可以在 FilterByTypes 里写两个值：Doc 和 PPT。
- **返回结果说明**
  - `FirstFileURL`：第一个符合条件的文件地址。
  - `FirstFile`：第一个符合条件的完整文件信息。
  - `Files`：所有符合条件的文件对象。
  - `FileURLs`：所有符合条件的文件地址列表。



**注意事项**

- 文件类型 Type 是通过文件扩展名和 MIME 类型推测出来的，不一定百分之百准确。
- 开启 GetExtraAttrs 会增加信息但会让处理变慢。
- 所有过滤都是不区分大小写的。



**使用流程建议**

1. 用 ParseUserInput 把用户输入分成文字和文件列表。
2. 用 ExtractFiles 对文件列表进行筛选。
3. 将筛选后的文件地址或文件内容用于后续处理，比如分析文件、存储文件等。
