// detail.js
const app = getApp()
const { request } = require('../../../utils/request')
const { ShowImgUrl, calculatePetAgeFormat, isRichTextContent } = require('../../../utils/util')
const urls = require('../../../utils/api')

Page({
	data: {
		recordId: '',
		isPreview: false,
		record: {},
		comments: [],
		commentPage: 1,
		commentPageSize: 20,
		hasMoreComments: false,
		isLoadingComments: false,
		commentText: '',
		replyTo: null,
		showActionSheet: false,
		showShareModal: false,
		isOwner: false,

		// 海报相关
		showPosterModal: false,
		posterGenerating: false,
		posterTempPath: '',
		qrCodeUrl: '',
		// canvas 尺寸（px，非rpx）
		posterW: 375,
		posterH: 667,
	},

	onLoad(options) {
		const recordType = options.recordType || 'timeline'
		this.setData({ recordType })
		if (options.isPreview === 'true') {
			this.setData({
				isPreview: true,
				record: {
					...(app.globalData.previewRecord || {}),
					isRichContent: isRichTextContent((app.globalData.previewRecord || {}).content)
				}
			})
		} else if (options.id) {
			this.setData({ recordId: options.id })
			this.getRecordDetail(options.id, recordType)
		}
	},

	// 获取记录详情
	async getRecordDetail(id, recordType) {
		try {
			wx.showLoading({ title: '加载中...' })
			const recordOneUrl = recordType === 'milestone'
				? urls.Milestone + `/${id}`
				: urls.recordOne + `/${id}`

			const res = await request({ url: recordOneUrl, method: 'GET' })

			if (res.code === 200 && res.data) {
				const record = res.data
				const userInfo = wx.getStorageSync('userInfo')
				const baseDate = record.adoptDate || record.birthDate
				const age = calculatePetAgeFormat(baseDate, record.milestoneDate)
				this.setData({
					record: {
						...record,
						petAgeAtDate: age,
						isRichContent: isRichTextContent(record.content),
						mediaUrls: ShowImgUrl(record.mediaUrls),
					},
					isOwner: userInfo && record.userId === userInfo.userId
				})
			}
			wx.hideLoading()
		} catch (err) {
			console.error('获取记录详情失败', err)
			wx.hideLoading()
		}
	},

	getPlainContent(content = '') {
		return String(content)
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>|<\/div>|<\/h[1-6]>|<\/li>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.replace(/&amp;/gi, '&')
			.replace(/&quot;/gi, '"')
			.replace(/&#39;/gi, "'")
			.replace(/\n{3,}/g, '\n\n')
			.trim()
	},

	getShareTitle(record) {
		const content = this.getPlainContent(record.content || record.description || '')
		return content
			? content.slice(0, 30) + (content.length > 30 ? '...' : '')
			: `${record.petName || '宠物'}的温暖记录`
	},

	goBack() { wx.navigateBack() },

	showMoreActions() {
		if (this.data.isPreview) {
			wx.showToast({ title: '预览模式不支持操作', icon: 'none' })
			return
		}
		this.setData({ showActionSheet: true })
	},
	hideActionSheet() { this.setData({ showActionSheet: false }) },

	onEdit() {
		this.hideActionSheet()
		wx.navigateTo({ url: `/pages/record/diary/diary?draftId=${this.data.recordId}` })
	},

	onDelete() {
		this.hideActionSheet()
		wx.showModal({
			title: '确认删除',
			content: '删除后无法恢复，确定要删除这条记录吗？',
			success: (res) => { if (res.confirm) this.deleteRecord() }
		})
	},

	async deleteRecord() {
		try {
			wx.showLoading({ title: '删除中...' })
			const res = await request({ url: `/api/record/${this.data.recordId}`, method: 'DELETE' })
			wx.hideLoading()
			if (res.code === 200) {
				wx.showToast({ title: '删除成功', icon: 'success' })
				setTimeout(() => wx.navigateBack(), 1500)
			}
		} catch (err) {
			console.error('删除失败', err)
			wx.hideLoading()
		}
	},

	onCopyLink() {
		this.hideActionSheet()
		wx.setClipboardData({
			data: `${app.globalData.h5BaseUrl}/pages/record/detail/detail?id=${this.data.recordId}`,
			success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
		})
	},

	// 分享弹窗内的复制链接
	onCopyLinkFromShare() {
		this.hideShareModal()
		wx.setClipboardData({
			data: `${app.globalData.h5BaseUrl}/pages/record/detail/detail?id=${this.data.recordId}`,
			success: () => wx.showToast({ title: '链接已复制', icon: 'success' })
		})
	},

	onReport() {
		this.hideActionSheet()
		wx.showModal({
			title: '举报',
			content: '确定要举报这条内容吗？',
			success: async (res) => {
				if (res.confirm) {
					try {
						await request({ url: '/api/report', method: 'POST', data: { type: 'record', targetId: this.data.recordId } })
						wx.showToast({ title: '举报成功', icon: 'success' })
					} catch (err) { console.error('举报失败', err) }
				}
			}
		})
	},

	previewMedia(e) {
		const index = e.currentTarget.dataset.index
		const imgUrls = this.data.record.mediaUrls
			.filter(item => !item.type || item.type === 'image')
			.map(item => item.url)
		wx.previewImage({ current: imgUrls[index], urls: imgUrls })
	},

	onShare() {
		if (this.data.isPreview) {
			wx.showToast({ title: '预览模式不支持分享', icon: 'none' })
			return
		}
		// 提前调用 showShareMenu，确保分享菜单可用
		wx.showShareMenu({
			withShareTicket: true,
			menus: ['shareAppMessage', 'shareTimeline']
		})
		this.setData({ showShareModal: true })
	},
	hideShareModal() { this.setData({ showShareModal: false }) },

	// 页面分享给好友（button open-type="share" 触发）
	onShareAppMessage() {
		const { record, recordId } = this.data
		const coverUrl = record.mediaUrls && record.mediaUrls[0] && record.mediaUrls[0].url
		return {
			title: this.getShareTitle(record),
			path: `/pages/record/detail/detail?id=${recordId}`,
			imageUrl: coverUrl || ''
		}
	},

	// 分享到朋友圈（button open-type="shareTimeline" 触发）
	onShareTimeline() {
		const { record, recordId } = this.data
		const coverUrl = record.mediaUrls && record.mediaUrls[0] && record.mediaUrls[0].url
		return {
			title: this.getShareTitle(record),
			query: `id=${recordId}`,
			imageUrl: coverUrl || ''
		}
	},

	// ─── 海报生成入口 ───────────────────────────────────────────
	async savePoster() {
		this.hideShareModal()
		this.setData({
			showPosterModal: true,
			posterGenerating: true,
			posterTempPath: ''
		})

		try {
			// 0. 初始化 Canvas
			const canvasInfo = await this.getCanvasNode()
			this.canvasNode = canvasInfo.node
			this.canvasCtx = canvasInfo.ctx
			// 1. 获取小程序码
			await this.fetchQrCode()
			// 2. 下载所需图片资源
			const assets = await this.downloadAssets()
			// 3. 将下载的图片路径转换为 Image 对象
			const images = await this.loadPosterImages(assets)
			// 4. 绘制 Canvas
			this.drawPosterCanvas(images)
			// 5. 导出图片
			await this.exportCanvas()
		} catch (err) {
			console.error('生成海报失败', err)
			this.setData({ posterGenerating: false })
			wx.showToast({ title: '生成失败，请重试', icon: 'none' })
		}
	},

	// 初始化 Canvas 节点（Canvas 2D API）
	getCanvasNode() {
		return new Promise((resolve, reject) => {
			const query = wx.createSelectorQuery()
			query.select('#posterCanvas')
				.fields({ node: true, size: true })
				.exec((res) => {
					if (!res || !res[0]) {
						reject(new Error('Canvas not found'))
						return
					}
					const canvas = res[0].node
					const ctx = canvas.getContext('2d')
					const dpr = wx.getSystemInfoSync().pixelRatio
					canvas.width = this.data.posterW * dpr
					canvas.height = this.data.posterH * dpr
					ctx.scale(dpr, dpr)
					resolve({ node: canvas, ctx })
				})
		})
	},

	// 加载图片到 Canvas Image 对象
	async loadPosterImages(assets) {
		const images = {}
		for (const key of ['cover', 'avatar', 'qr']) {
			if (assets[key]) {
				images[key] = await this.loadCanvasImage(assets[key])
			} else {
				images[key] = null
			}
		}
		return images
	},

	loadCanvasImage(src) {
		return new Promise((resolve) => {
			if (!src) { resolve(null); return }
			const img = this.canvasNode.createImage()
			img.onload = () => resolve(img)
			img.onerror = () => resolve(null)
			img.src = src
		})
	},

	// 获取小程序码
	async fetchQrCode() {
		try {
			const res = await request({
				url: urls.genwxaCode,
				method: 'POST',
				data: {
					path: `pages/record/detail/detail?id=${this.data.recordId}`,
					width: 120
				}
			})
			if (res.code === 200 && res.data && res.data.qrCodeUrl) {
				this.setData({ qrCodeUrl:urls.imgUrl+res.data.qrCodeUrl })
			}
		} catch (err) {
			console.error('获取小程序码失败', err)
			// 不阻断流程
		}
	},

	// 下载图片资源（头像、封面图、小程序码）
	downloadAssets() {
		const { record, qrCodeUrl } = this.data
		const tasks = []

		const coverUrl = record.mediaUrls && record.mediaUrls[0] && record.mediaUrls[0].url
		if (coverUrl) {
			tasks.push(this.downloadImage(coverUrl).then(p => ({ key: 'cover', path: p })))
		}
		if (record.avatarUrl) {
			tasks.push(this.downloadImage(record.avatarUrl).then(p => ({ key: 'avatar', path: p })))
		}
		if (qrCodeUrl) {
			tasks.push(this.downloadImage(qrCodeUrl).then(p => ({ key: 'qr', path: p })))
		}

		return Promise.all(tasks).then(results => {
			const map = {}
			results.forEach(r => { if (r && r.path) map[r.key] = r.path })
			return map
		})
	},

	// 下载单张图片
	downloadImage(url) {
		return new Promise((resolve) => {
			wx.downloadFile({
				url,
				success: (res) => resolve(res.statusCode === 200 ? res.tempFilePath : null),
				fail: () => resolve(null)
			})
		})
	},

	// 绘制海报 Canvas（Canvas 2D API）
	drawPosterCanvas(images) {
		const ctx = this.canvasCtx
		const { record } = this.data
		const W = this.data.posterW	 // 375
		const H = this.data.posterH	 // 667

		// ── 背景 ──────────────────────────────────────────
		const bg = ctx.createLinearGradient(0, 0, 0, H)
		bg.addColorStop(0, '#FFFBF5')
		bg.addColorStop(1, '#FFE6D6')
		ctx.fillStyle = bg
		ctx.fillRect(0, 0, W, H)

		// 装饰圆
		ctx.fillStyle = 'rgba(255,183,77,0.12)'
		ctx.beginPath(); ctx.arc(W * 0.85, 60, 80, 0, Math.PI * 2); ctx.fill()
		ctx.beginPath(); ctx.arc(W * 0.1, H - 80, 60, 0, Math.PI * 2); ctx.fill()

		// ── 顶部品牌栏 ────────────────────────────────────
		ctx.fillStyle = '#FFFFFF'
		this.roundRect(ctx, 20, 20, W - 40, 70, 16)
		ctx.fill()

		ctx.font = '22px sans-serif'
		ctx.fillStyle = '#FF8A65'
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillText('🐾 爪印记忆', 36, 55)

		ctx.font = '16px sans-serif'
		ctx.fillStyle = '#A89F9A'
		ctx.textAlign = 'right'
		ctx.fillText(record.createTime || '', W - 36, 55)

		// ── 封面图（保持原比例，居中裁剪）────────────────────────
		const imgY = 108
		const imgH = 200
		const coverW = W - 40
		if (images.cover) {
			const imgW = images.cover.width
			const imgH_actual = images.cover.height
			const ratio = Math.max(coverW / imgW, imgH / imgH_actual)
			const drawW = imgW * ratio
			const drawH = imgH_actual * ratio
			const drawX = 20 + (coverW - drawW) / 2
			const drawY = imgY + (imgH - drawH) / 2
			ctx.save()
			this.roundRect(ctx, 20, imgY, coverW, imgH, 16)
			ctx.clip()
			ctx.drawImage(images.cover, drawX, drawY, drawW, drawH)
			ctx.restore()
		} else {
			const ph = ctx.createLinearGradient(20, imgY, W - 20, imgY + imgH)
			ph.addColorStop(0, '#FFE0CC')
			ph.addColorStop(1, '#FFDAB9')
			ctx.fillStyle = ph
			this.roundRect(ctx, 20, imgY, W - 40, imgH, 16)
			ctx.fill()
			ctx.font = '48px sans-serif'
			ctx.fillStyle = 'rgba(255,138,101,0.5)'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText('🐾', W / 2, imgY + imgH / 2)
		}

		// 图片数量角标
		if (record.mediaUrls && record.mediaUrls.length > 1) {
			ctx.fillStyle = 'rgba(0,0,0,0.45)'
			this.roundRect(ctx, W - 70, imgY + imgH - 36, 50, 26, 8)
			ctx.fill()
			ctx.font = '14px sans-serif'
			ctx.fillStyle = '#FFFFFF'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText(`+${record.mediaUrls.length - 1}`, W - 45, imgY + imgH - 23)
		}

		// ── 用户信息行 ────────────────────────────────────
		const userY = imgY + imgH + 20
		if (images.avatar) {
			ctx.save()
			ctx.beginPath()
			ctx.arc(44, userY + 20, 20, 0, Math.PI * 2)
			ctx.clip()
			ctx.drawImage(images.avatar, 24, userY, 40, 40)
			ctx.restore()
		} else {
			ctx.fillStyle = '#FFE0CC'
			ctx.beginPath()
			ctx.arc(44, userY + 20, 20, 0, Math.PI * 2)
			ctx.fill()
		}
		ctx.font = '18px sans-serif'
		ctx.fillStyle = '#5C4A42'
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillText(record.nickname || '神秘铲屎官', 74, userY + 16)
		ctx.font = '14px sans-serif'
		ctx.fillStyle = '#A89F9A'
		ctx.fillText(`与 ${record.petName || 'TA'} 的温暖时光`, 74, userY + 36)

		// ── 内容卡片 ──────────────────────────────────────
		const cardY = userY + 56
		const cardH = H - cardY - 120
		ctx.fillStyle = '#FFFFFF'
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 4
		ctx.shadowBlur = 12
		ctx.shadowColor = 'rgba(180,160,140,0.12)'
		this.roundRect(ctx, 20, cardY, W - 40, cardH, 16)
		ctx.fill()
		ctx.shadowOffsetX = 0
		ctx.shadowOffsetY = 0
		ctx.shadowBlur = 0
		ctx.shadowColor = 'transparent'

		// 顶部橙色装饰条
		ctx.fillStyle = '#FF8A65'
		this.roundRect(ctx, 20, cardY, W - 40, 6, 3)
		ctx.fill()

		// 心情标签
		let textStartY = cardY + 24
		if (record.moodTag) {
			ctx.fillStyle = '#FFF0E5'
			this.roundRect(ctx, 36, textStartY, 100, 28, 8)
			ctx.fill()
			ctx.font = '14px sans-serif'
			ctx.fillStyle = '#FF8A65'
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			ctx.fillText(record.moodTag, 46, textStartY + 14)
			textStartY += 40
		}

		// 正文（最多 5 行）
		const content = this.getPlainContent(record.content || record.description || '')
		if (content) {
			ctx.font = '17px sans-serif'
			ctx.fillStyle = '#4A3E38'
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			const maxW = W - 40 - 32 * 2
			const lines = this.wrapText(content, maxW, 17)
			const maxLines = 5
			lines.slice(0, maxLines).forEach((line, i) => {
				const isLast = i === maxLines - 1 && lines.length > maxLines
				ctx.fillText(isLast ? line.slice(0, -1) + '...' : line, 52, textStartY + 22 + i * 28)
			})
		}

		// 位置
		if (record.location) {
			ctx.font = '14px sans-serif'
			ctx.fillStyle = '#A89F9A'
			ctx.textAlign = 'left'
			ctx.textBaseline = 'middle'
			ctx.fillText(`📍 ${record.location}`, 36, cardY + cardH - 14)
		}

		// ── 底部：小程序码 + 提示 ─────────────────────────
		const footerY = H - 110
		ctx.fillStyle = '#FFFFFF'
		this.roundRect(ctx, 20, footerY, W - 40, 90, 16)
		ctx.fill()

		if (images.qr) {
			ctx.drawImage(images.qr, W - 100, footerY + 10, 70, 70)
		} else {
			ctx.fillStyle = '#F5F0EB'
			this.roundRect(ctx, W - 100, footerY + 10, 70, 70, 8)
			ctx.fill()
			ctx.font = '12px sans-serif'
			ctx.fillStyle = '#BDB3AC'
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText('小程序码', W - 65, footerY + 45)
		}

		ctx.font = '16px sans-serif'
		ctx.fillStyle = '#5C4A42'
		ctx.textAlign = 'left'
		ctx.textBaseline = 'middle'
		ctx.fillText('扫码查看完整记录', 36, footerY + 34)
		ctx.font = '13px sans-serif'
		ctx.fillStyle = '#A89F9A'
		ctx.fillText('爪印记忆 · 记录与TA的温暖时光', 36, footerY + 58)
	},

	// 文本自动换行
	wrapText(text, maxWidth, fontSize) {
		const chars = text.split('')
		const lines = []
		let line = ''
		for (const ch of chars) {
			if (ch === '\n') {
				lines.push(line)
				line = ''
				continue
			}
			const test = line + ch
			const w = [...test].reduce((acc, c) => acc + (c.charCodeAt(0) > 127 ? fontSize : fontSize * 0.6), 0)
			if (w > maxWidth && line) {
				lines.push(line)
				line = ch
			} else {
				line = test
			}
		}
		if (line) lines.push(line)
		return lines
	},

	// 圆角矩形路径
	roundRect(ctx, x, y, w, h, r) {
		ctx.beginPath()
		ctx.moveTo(x + r, y)
		ctx.lineTo(x + w - r, y)
		ctx.arcTo(x + w, y, x + w, y + r, r)
		ctx.lineTo(x + w, y + h - r)
		ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
		ctx.lineTo(x + r, y + h)
		ctx.arcTo(x, y + h, x, y + h - r, r)
		ctx.lineTo(x, y + r)
		ctx.arcTo(x, y, x + r, y, r)
		ctx.closePath()
	},

	// 导出 Canvas 为图片（Canvas 2D API）
	exportCanvas() {
		return new Promise((resolve, reject) => {
			wx.canvasToTempFilePath({
				canvas: this.canvasNode,
				fileType: 'png',
				success: (res) => {
					this.setData({
						posterTempPath: res.tempFilePath,
						posterGenerating: false
					})
					resolve(res.tempFilePath)
				},
				fail: (err) => {
					console.error('导出失败', err)
					reject(err)
				}
			}, this)
		})
	},

	// 关闭海报弹窗
	hidePosterModal() {
		this.setData({ showPosterModal: false })
	},

	// 保存海报到相册
	savePosterToAlbum() {
		if (!this.data.posterTempPath) return
		wx.saveImageToPhotosAlbum({
			filePath: this.data.posterTempPath,
			success: () => wx.showToast({ title: '已保存到相册 🎉', icon: 'success' }),
			fail: (err) => {
				if (err.errMsg && err.errMsg.includes('auth deny')) {
					wx.showModal({
						title: '需要相册权限',
						content: '请在设置中允许访问相册',
						confirmText: '去设置',
						success: (r) => { if (r.confirm) wx.openSetting() }
					})
				} else {
					wx.showToast({ title: '保存失败', icon: 'none' })
				}
			}
		})
	},

	// 分享海报到朋友圈（提示长按）
	sharePosterToMoments() {
		wx.showToast({ title: '长按图片可分享到朋友圈', icon: 'none', duration: 2500 })
	},

	// ─── 评论相关（暂未启用）────────────────────────────────────
	async getComments() {},
	loadMoreComments() {},
	scrollToComments() {},
	onCommentInput(e) { this.setData({ commentText: e.detail.value }) },
	onCommentFocus() {},
	onCommentBlur() { if (!this.data.commentText) this.setData({ replyTo: null }) },
	onReply(e) { this.setData({ replyTo: e.currentTarget.dataset.comment }) },
	async submitComment() {},
	async toggleLike() {},
	async likeComment() {}
})
