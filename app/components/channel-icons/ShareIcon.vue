<script setup lang="ts">
import { APP_NAME, LIB_JS_URL, Origin } from '@/core/config/env.ts'
import { BaseIcon, Progress } from '@/base'
import { usePracticeStore } from '@/core/stores/practice.ts'
import { useBaseStore } from '@/core/stores/base.ts'
import { loadJsLib, msToHourMinute } from '@/core/utils'
import dayjs from 'dayjs'
import { defineAsyncComponent } from 'vue'
import { withAppBaseURL } from '@/core/utils/base-url'

const Dialog = defineAsyncComponent(() => import('@/base/dialog/Dialog.vue'))

const practiceStore = usePracticeStore()
const baseStore = useBaseStore()

let showShareDialog = $ref(false)
let loading1 = $ref(false)
let loading2 = $ref(false)
let posterEl = $ref<HTMLDivElement | null>(null)
let imgIndex = $ref(Math.floor(Math.random() * 10))

// 计算学习统计数据
const studyStats = $computed(() => {
  return {
    total: practiceStore.total,
    newWords: practiceStore.newWordNumber,
    review: practiceStore.reviewWordNumber,
    wrong: practiceStore.wrong,
    correct: practiceStore.total - practiceStore.wrong,
    time: msToHourMinute(practiceStore.spend),
    date: dayjs().format('MM月DD日'),
    dictionary: baseStore.sdict.name || '未知词书',
  }
})

// 复制图片到剪贴板
async function copyImageToClipboard() {
  try {
    loading1 = true
    const snapdom = await loadJsLib('snapdom', LIB_JS_URL.SNAPDOM)
    const blob = await snapdom.toBlob(posterEl, { scale: 2, type: 'png' })
    if (!blob) throw new Error('capture failed')

    if (navigator.clipboard && (window as any).ClipboardItem) {
      await navigator.clipboard.write([new (window as any).ClipboardItem({ [blob.type || 'image/png']: blob })])
      Toass.success('图片已复制到剪贴板！')
    } else {
      await downloadImage()
    }
  } catch (error) {
    Toass.error('复制失败！')
    await downloadImage()
  } finally {
    loading1 = false
  }
}

// 下载图片
async function downloadImage() {
  loading2 = true
  const snapdom = await loadJsLib('snapdom', LIB_JS_URL.SNAPDOM)
  snapdom.download(posterEl, { scale: 2 })
  loading2 = false
}

// 切换背景
function changeBackground() {
  const newIndex = Math.floor(Math.random() * 9) // 0-8
  imgIndex = newIndex >= imgIndex ? newIndex + 1 : newIndex
}

// 计算学习进度百分比
const studyProgress = $computed(() => {
  if (!baseStore.sdict.length) return 0
  return Math.round((baseStore.sdict.lastLearnIndex / baseStore.sdict.length) * 100)
})

const sentence = $computed(() => {
  let list = [
    { fr: 'Les actes valent mieux que les paroles.', cn: '行动胜于言语' },
    { fr: 'Continue sans jamais abandonner !', cn: '坚持就是胜利' },
    { fr: 'Quand on veut, on peut.', cn: '有志者事竟成' },
    { fr: 'Après la pluie, le beau temps.', cn: '黑暗中总有一线光明' },
    { fr: 'Le temps guérit toutes les blessures.', cn: '时间能治愈一切创伤' },
    { fr: 'Ne baisse jamais les bras.', cn: '永不言败' },
    { fr: 'Le meilleur reste à venir.', cn: '最好的尚未到来' },
    { fr: 'Crois en toi et tu es déjà à mi-chemin.', cn: '相信你自己，你已经成功了一半' },
    { fr: 'Pas de peine, pas de gain.', cn: '没有付出就没有收获' },
    { fr: 'Vois grand et ose échouer.', cn: '大胆梦想，勇于失败' },
    { fr: 'Le cœur est là où est la maison.', cn: '心在哪里，家就在哪里' },
    { fr: 'Le savoir, c’est le pouvoir.', cn: '知识就是力量' },
    { fr: 'C’est en forgeant qu’on devient forgeron.', cn: '熟能生巧' },
    { fr: 'À Rome, fais comme les Romains.', cn: '入乡随俗' },
    { fr: 'Fonce.', cn: '只管去做' },
    { fr: 'Jusqu’ici, tout va bien.', cn: '到目前为止，一切还好' },
    { fr: 'L’avenir appartient à ceux qui se lèvent tôt.', cn: '早起的鸟儿有虫吃' },
    { fr: 'Chaque jour est un nouveau départ.', cn: '每一天都是新的开始' },
    { fr: 'Le succès est un voyage, pas une destination.', cn: '成功是旅程，不是终点' },
    { fr: 'Ta seule limite, c’est ton esprit.', cn: '你唯一的限制是你的思维' },
    { fr: 'C’est dans le besoin qu’on reconnaît ses amis.', cn: '患难见真情' },
    { fr: 'Le silence est d’or.', cn: '沉默是金' },
    { fr: 'Ce qui est passé est passé.', cn: '让过去的成为过去' },
    { fr: 'Reste calme et continue.', cn: '保持冷静，继续前进' },
    { fr: 'On apprend à tout âge.', cn: '活到老，学到老' },
    { fr: 'Les erreurs prouvent que tu essaies.', cn: '错误证明你在努力尝试' },
    { fr: 'Mieux vaut tard que jamais.', cn: '迟做总比不做好' },
    { fr: 'Sois le changement que tu veux voir dans le monde.', cn: '成为你希望在世界上看到的改变' },
    { fr: 'Un voyage de mille lieues commence par un premier pas.', cn: '千里之行，始于足下' },
    { fr: 'Quand une porte se ferme, une autre s’ouvre.', cn: '当一扇门关闭时，另一扇会打开' },
  ]
  return list[Math.floor(Math.random() * list.length)]
})
</script>

<template>
  <!-- 分享学习总结按钮 -->
  <BaseIcon @click="showShareDialog = true" class="bounce">
    <IconFluentShare20Regular class="text-blue-500 hover:text-blue-600" />
  </BaseIcon>

  <!-- 学习总结分享图片生成对话框 -->
  <Dialog v-model="showShareDialog" title="分享">
    <div class="flex min-w-160 max-w-200 p-6 pt-0 gap-space">
      <!-- 左侧：海报预览区域 -->
      <div ref="posterEl" class="flex-1 border-r border-gray-200 bg-gray-100 rounded-xl overflow-hidden relative">
        <div class="flex p-5 gap-space flex-col justify-between relative z-2 color-white h-full box-border">
          <div class="flex flex-col flex-1 space-y-3">
            <!-- 顶部用户信息 -->
            <div class="flex items-center">
              <div class="ml-auto text-xs">Type Words | 法语学习</div>
            </div>

            <div class="bg-gray-900/30 py-4 center flex-col rounded-2xl">
              <div class="text-center mb-2 text-xl">我学习了{{ studyStats.time }} {{ baseStore.sdict.name }}</div>
              <!-- Progress Overview -->
              <div class="w-90/100 flex items-center gap-space">
                <div class="shrink-0">进度</div>
                <Progress :percentage="studyProgress" size="normal" />
              </div>
            </div>

            <!-- 统计数据 -->
            <div class="grid grid-cols-3 gap-4">
              <div class="stat-card">
                <div class="text-2xl font-bold">{{ studyStats.newWords }}</div>
                <div class="text-base">新词</div>
              </div>
              <div class="stat-card">
                <div class="text-2xl font-bold">{{ studyStats.review }}</div>
                <div class="text-base">复习</div>
              </div>
              <div class="stat-card">
                <div class="text-2xl font-bold">{{ studyStats.wrong }}</div>
                <div class="text-base">错词</div>
              </div>
            </div>

            <!-- 励志语句 -->
            <div class="bg-gray-900/30 py-4 rounded-2xl center flex-col flex-1 p-4">
              <div class="text-3xl text-center italic mb-2 en-article-family">{{ sentence.fr }}</div>
              <div class="text-base italic">{{ sentence.cn }}</div>
            </div>
          </div>

          <!-- 底部品牌信息 -->
          <div class="bg-gray-900/30 py-4 rounded-2xl p-4">
            <div class="flex justify-between items-end">
              <div class="space-y-2">
                <div class="font-bold text-2xl">Type Words</div>
                <div class="text-base">{{ Origin }}</div>
                <div class="text-xs">一次敲击，一点进步，开源单词学习工具</div>
              </div>
              <img :src="withAppBaseURL('/imgs/share/qr.png')" class="w-20 w-20 rounded-md overflow-hidden" alt="" />
            </div>
          </div>
        </div>

        <img
          :src="withAppBaseURL(`/imgs/share/bg/${imgIndex}.jpg`)"
          class="w-full object-cover object-center absolute top-0"
          alt=""
        />
      </div>

      <!-- 右侧：分享引导区域 -->
      <div class="flex-1 pt-0">
        <div class="">
          <div class="text-2xl font-bold mb-4 flex items-center">
            <span class="mr-2">🎯</span>
            分享你的进步
          </div>
          <div class="flex items-start">
            <span class="mr-2">🚀</span>
            在 {{ APP_NAME }}，学习法语也能成为超酷的事情！
          </div>
          <div class="flex items-start">
            <span class="mr-2">📸</span>
            快来分享你的学习图片，让你的进步刷屏朋友圈，成为最受瞩目的法语学霸！😎
          </div>
          <div class="flex items-start">
            <span class="mr-2">💪</span>
            这不只是简单的打卡，更是你秀出法语实力的舞台！
          </div>
          <div class="flex items-start">
            <span class="mr-2">🔥</span>
            分享你的学习记录，收获朋友们的点赞和认可，让你的朋友圈也掀起一股法语学习的热潮！
          </div>
        </div>

        <div class="space-y-4 mt-24">
          <!-- 个性化装扮 -->
          <div
            @click="changeBackground"
            class="flex items-center justify-start gap-space color-black px-6 py-3 bg-gray-200 rounded-lg cp hover:bg-gray-300 transition-all duration-200"
          >
            <IconMdiSparkles class="w-4 h-4 text-yellow-500" />
            换个背景
          </div>

          <!-- 分享战绩 -->
          <div
            @click="copyImageToClipboard"
            class="flex items-center justify-start gap-space px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white cp rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200"
          >
            <IconEosIconsLoading class="text-xl" v-if="loading1" />
            <IconFluentCopy20Regular class="w-5 h-5" v-else />
            <span class="font-medium">复制到剪贴板</span>
          </div>

          <div
            @click="downloadImage"
            class="flex items-center justify-start gap-space px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white cp rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200"
          >
            <IconEosIconsLoading class="text-xl" v-if="loading2" />
            <IconFluentArrowDownload20Regular class="w-5 h-5" v-else />
            <span class="font-medium">保存高清海报</span>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped lang="scss">
.stat-card {
  @apply text-center bg-gray-900/30 py-4 rounded-2xl;
}
</style>
