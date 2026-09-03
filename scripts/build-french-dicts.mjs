// 生成法语分级词典数据：
//   1. 解析 french-vocabulary-list-main/data/levels/*.js (window.VOCAB_LEVELS)
//   2. 从 kaikki.org-dictionary-French.jsonl 提取 word -> IPA 映射
//   3. 输出 public/dicts/fr/word/<LEVEL>.json (TypeWords 的 Word 格式)
import { readFileSync, writeFileSync, createReadStream, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const VOCAB_DIR = resolve(root, 'french-vocabulary-list-main', 'data', 'levels')
const KAIKKI = resolve(root, 'kaikki.org-dictionary-French.jsonl')
const OUT_DIR = resolve(root, 'public', 'dicts', 'fr', 'word')

// ---------- 1. 解析 level js ----------
function parseLevel(level) {
  const path = `${VOCAB_DIR}/${level}.js`
  const raw = readFileSync(path, 'utf8')
  const match = raw.match(/window\.VOCAB_LEVELS\["([A-C]\d)"\]\s*=\s*(\[.*\])\s*;/s)
  if (!match) throw new Error(`无法解析 ${path}`)
  return JSON.parse(match[2])
}

// ---------- 2. 提取 word -> IPA (流式，避免 573MB 一次性载入内存) ----------
// 一份 word 可能有多个 pos / 多个 sound 条目，取第一个带 ipa 的即可
async function buildIpaMap() {
  const map = new Map()
  const rl = createInterface({ input: createReadStream(KAIKKI, { encoding: 'utf8' }) })
  let count = 0
  for await (const line of rl) {
    if (!line.trim()) continue
    count++
    let d
    try {
      d = JSON.parse(line)
    } catch {
      continue
    }
    const word = d && d.word
    if (!word || typeof word !== 'string') continue
    if (map.has(word)) continue // 已有关键词 IPA 就跳过，保留先出现的
    const sounds = d.sounds || []
    for (const s of sounds) {
      if (s && s.ipa) {
        map.set(word, s.ipa)
        break
      }
    }
  }
  console.log(`kaikki 扫描 ${count} 条，得到 ${map.size} 个 IPA`)
  return map
}

// ---------- 3. 组装 Word 结构 ----------
function toWord(item, ipa) {
  const pos = (item.pos || '').trim()
  const meaning = (item.meaning || '').trim()
  const notes = (item.notes || '').trim()

  // trans: 主释义 (pos + cn)
  const trans = meaning ? [{ pos, cn: meaning }] : []

  // phrases: 用 notes 拆成短语（按 "；" / "；" 分隔）
  const phrases = notes
    ? notes
        .split(/[；;]/)
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => {
          // 形如 "de rien 不客气" 拆成法语 + 中文
          const idx = s.search(/[一-鿿]/)
          if (idx > 0) return { c: s.slice(0, idx).trim(), cn: s.slice(idx).trim() }
          return { c: s, cn: '' }
        })
    : []

  // sentences: 从 examples 映射 { it -> c, zh -> cn }
  const sentences = (item.examples || [])
    .filter(e => e && e.it)
    .map(e => ({ c: (e.it || '').trim(), cn: (e.zh || '').trim() }))

  return {
    id: String(item.rank),
    word: item.word,
    phonetic0: ipa || '',
    phonetic1: ipa || '',
    trans,
    sentences,
    phrases,
    synos: [],
    relWords: { root: '', rels: [] },
    etymology: [],
    custom: false,
    audio: `dicts/fr/sound/${levelName}/`, // 占位，稍后按 rank 填充
  }
}

// 全局变量用于 toWord 里 levelName
let levelName = ''

// ---------- main ----------
async function main() {
  console.log('开始构建法语音标映射…')
  const ipaMap = await buildIpaMap()
  mkdirSync(OUT_DIR, { recursive: true })

  for (const level of LEVELS) {
    levelName = level
    const items = parseLevel(level)
    const words = items.map((item, i) => {
      const key = (item.word || '').trim().toLowerCase()
      // 连同常见变体一起查 (缩小写、去重音符号的匹配可以后补)
      const ipa = ipaMap.get(key) || ipaMap.get(item.word) || ''
      const w = toWord(item, ipa)
      // 填写音频路径
      const rankPadded = String(item.rank).padStart(4, '0')
      w.audio = `dicts/fr/sound/${level}/${rankPadded}.mp3`
      return w
    })
    const outPath = `${OUT_DIR}/${level}.json`
    writeFileSync(outPath, JSON.stringify(words), 'utf8')
    console.log(`${level}: ${words.length} 词 -> ${outPath}`)
  }
  console.log('完成')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})