import { Args } from '@/runtime';
import { Input, Output, FilesItems } from "@/typings/ParseUserInput/ParseUserInput";

const regex = /,(?<url>https:\/\/(?<domain>[-\w\.]+\.coze\.(cn|com))\/.+?\/bot_files\/(?<userid>\d+)\/(?<mime>.+?)\/\d+\/(?<name>[^\/]+?(?<extname>\.[^\/]+?))\?(?<params>[^,]+))/gm;

function dateToString (date: Date): string {
  // 格式化为本地日期时间（示例：2023-10-01 14:30:45）
  const pad = (num: number) => num.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function matchType(mime: string, extname: string): string {
  // 统一转为小写方便比较
  const mimeLower = mime.toLowerCase();
  const extLower = extname.toLowerCase().replace(/^\./, '');

  // 图片类型检测
  if (mimeLower.startsWith('image/')) {
    return mimeLower.includes('svg') || extLower === 'svg' ? 'Svg' : 'Image';
  }

  // 音视频类型检测
  if (mimeLower.startsWith('audio/')) return 'Audio';
  if (mimeLower.startsWith('video/')) return 'Video';

  // 文档类型检测 (优先检查扩展名，因为 MIME 类型可能不准确)
  const documentExts = ['doc', 'docx', 'dot', 'dotx', 'odt', 'rtf'];
  const pptExts = ['ppt', 'pptx', 'pps', 'ppsx', 'odp'];
  const excelExts = ['xls', 'xlsx', 'csv', 'ods'];
  const pdfExts = ['pdf'];

  if (documentExts.includes(extLower) || mimeLower.includes('msword') || mimeLower.includes('wordprocessingml')) {
    return 'Doc';
  }
  if (pptExts.includes(extLower) || mimeLower.includes('presentationml')) {
    return 'PPT';
  }
  if (excelExts.includes(extLower) || mimeLower.includes('spreadsheetml')) {
    return 'Excel';
  }
  if (pdfExts.includes(extLower) || mimeLower.includes('pdf')) {
    return 'Doc'; // PDF 归类为文档
  }

  // 文本和代码类型
  if (mimeLower.startsWith('text/')) {
    const codeExts = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'php', 'sh', 'go', 'rs', 'swift'];
    return codeExts.includes(extLower) ? 'Code' : 'Txt';
  }

  // 压缩包类型
  const archiveExts = ['zip', '7z', 'rar', 'tar', 'gz', 'bz2', 'xz'];
  if (archiveExts.includes(extLower) || 
      mimeLower.includes('zip') || 
      mimeLower.includes('compressed') || 
      mimeLower.includes('archive')) {
    return 'Zip';
  }

  // 特殊代码文件扩展名（可能没有 text/ MIME 类型）
  const codeExts = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'php', 'sh', 'go', 'rs', 'swift'];
  if (codeExts.includes(extLower)) {
    return 'Code';
  }

  // 默认返回 Other
  return 'Other';
}


function parseExpires(expires: number): string {
  if (expires <= 0) return '永不过期';

  // 将秒级时间戳转为毫秒（JavaScript Date 需要毫秒）
  const date = new Date(expires * 1000);

  return dateToString(date);
}

function toHumanReadableSize(size: number): string {
  if (size === -1) {
    return '未知大小';
  }

  if (size === 0) {
    return '0 字节';
  }

  const units = ['字节', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const base = 1024;
  const exponent = Math.floor(Math.log(size) / Math.log(base));
  const adjustedSize = (size / Math.pow(base, exponent)).toFixed(2);

  // 移除末尾的 ".00"（如果是整数）
  const formattedSize = adjustedSize.replace(/\.0+$|(\..+?)0+$/, '$1');

  return `${formattedSize} ${units[exponent]}`;
}

function extractCharset(mimeArgs: string): string {
  if (!mimeArgs) return '';

  // 统一用小写查找，但保留原字符串以提取原始大小写
  const lower = mimeArgs.toLowerCase();
  const key = 'charset';
  let idx = lower.indexOf(key);
  if (idx === -1) {
    return '';
  }

  // 找到 'charset' 后，定位等号
  idx += key.length; // 跳过 'charset'
  const eqIdx = mimeArgs.indexOf('=', idx);
  if (eqIdx === -1) {
    return '';
  }

  // 从等号后开始，跳过空白，找到值的起始位置
  let start = eqIdx + 1;
  while (start < mimeArgs.length && /\s/.test(mimeArgs[start])) {
    start++;
  }
  if (start >= mimeArgs.length) {
    return '';
  }

  // 检查是否被引号包裹
  let quoteChar: string | null = null;
  if (mimeArgs[start] === '"' || mimeArgs[start] === "'") {
    quoteChar = mimeArgs[start];
    start++;
  }

  // 找到值的结束位置：如果有引号，就找对应的引号；否则找下一个分号或字符串末尾
  let end: number;
  if (quoteChar) {
    end = mimeArgs.indexOf(quoteChar, start);
    if (end === -1) {
      // 没有闭合引号，就截取到末尾
      end = mimeArgs.length;
    }
  } else {
    const semi = mimeArgs.indexOf(';', start);
    end = semi === -1 ? mimeArgs.length : semi;
  }

  // 截取并去除前后空白
  const rawValue = mimeArgs.slice(start, end).trim();
  return rawValue === '' ? '' : rawValue;
}

async function getExtraAttrs(url: string): Promise<{size: number, mime: string, uploadDatetime: string}> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',     // 只请求头部信息，不下载文件内容
      cache: 'no-store',  // 避免缓存影响
    });

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    let size = parseInt(response.headers.get('Content-Length') || '-1', 10);
    let mime = response.headers.get('Content-Type') || null;
    let lastModified = response.headers.get('Last-Modified') || null;
    let uploadDatetime = lastModified !== null ? dateToString(new Date(lastModified)) : null;

    return {size, mime, uploadDatetime};
  } catch (error) {
    console.error('获取文件大小失败:', error);
    return {size: -1, mime: null, uploadDatetime: null};
  }
}


async function* regexExtract(text: string, extra: boolean): AsyncGenerator<{Index: number, File: FilesItems}, void, void> {
  // 提取所有匹配项并结构化
  let match: RegExpExecArray;
  while ((match = regex.exec(text)) !== null) {
      const { index: Index, groups } = match;
      let {url: URL, domain: Domain, userid: UserID, mime: MediaType, name: Name, extname: ExtName, params} = groups;
      let {lk3s, 'x-expires': expires, 'x-signature': signature} = Object.fromEntries(new URLSearchParams(params));
      let Expires = parseInt(expires);
      let Size = -1;
      let UploadDatetime = '';
      if (extra) {
        let {size, mime, uploadDatetime} = await getExtraAttrs(URL);
        Size = size;
        UploadDatetime = uploadDatetime;
        if (mime && mime !== MediaType) {
          MediaType = mime;
        }
      }
      let MediaTypeArgs = '';
      let mediaTypeArgsIndex = MediaType.indexOf(';');
      if (mediaTypeArgsIndex !== -1) {
        MediaTypeArgs = MediaType.substring(mediaTypeArgsIndex);
        if (MediaTypeArgs.length !== 0) {
          MediaTypeArgs = MediaTypeArgs.slice(1);
        }
        MediaType = MediaType.substring(0, mediaTypeArgsIndex);
      }
      yield {
        Index,
        File: {
          Domain,
          UserID,
          Type: matchType(MediaType, ExtName),
          MediaType,
          URL,
          Name,
          ExtName,
          LK3S: lk3s,
          Expires,
          ParsedExpires: parseExpires(Expires),
          Signature: signature,
          Charset: extractCharset(MediaTypeArgs),
          Size,
          HumanReadableSize: toHumanReadableSize(Size),
          UploadDatetime,
          MediaTypeArgs,
        }
      };
  }
}

export async function handler({ input }: Args<Input>): Promise<Output> {
  let firstIndex = -1;
  let Files: FilesItems[] = [];
  let extra = Boolean(input.GetExtraAttrs);
  for await (const {Index, File} of regexExtract(input.USER_INPUT, extra)) {
    if (firstIndex === -1) {
      firstIndex = Index;
    }
    Files.push(File);
  }
  return {
    UserMessage: input.USER_INPUT.substring(0, firstIndex),
    Files,
  }
};