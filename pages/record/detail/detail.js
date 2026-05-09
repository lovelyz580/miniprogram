// detail.js
const app = getApp()
const { request } = require('../../../utils/request')
const { ShowImgUrl, calculatePetAgeFormat } = require('../../../utils/util')
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
				record: app.globalData.previewRecord || {}
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
			title: record.content
				? record.content.slice(0, 30) + (record.content.length > 30 ? '...' : '')
				: `${record.petName || '宠物'}的温暖记录`,
			path: `/pages/record/detail/detail?id=${recordId}`,
			imageUrl: coverUrl || ''
		}
	},

	// 分享到朋友圈（button open-type="shareTimeline" 触发）
	onShareTimeline() {
		const { record, recordId } = this.data
		const coverUrl = record.mediaUrls && record.mediaUrls[0] && record.mediaUrls[0].url
		return {
			title: record.content
				? record.content.slice(0, 30) + (record.content.length > 30 ? '...' : '')
				: `${record.petName || '宠物'}的温暖记录`,
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
			// 1. 获取小程序码
			await this.fetchQrCode()
			// 2. 下载所需图片资源
			const assets = await this.downloadAssets()
			// 3. 绘制 Canvas
			await this.drawPosterCanvas(assets)
			// 4. 导出图片
			await this.exportCanvas()
		} catch (err) {
			console.error('生成海报失败', err)
			this.setData({ posterGenerating: false })
			wx.showToast({ title: '生成失败，请重试', icon: 'none' })
		}
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

	// 绘制海报 Canvas
	drawPosterCanvas(assets) {
		return new Promise((resolve, reject) => {
			const { record } = this.data
			const W = this.data.posterW   // 375
			const H = this.data.posterH   // 667
			const ctx = wx.createCanvasContext('posterCanvas')

			// ── 背景 ──────────────────────────────────────────
			const bg = ctx.createLinearGradient(0, 0, 0, H)
			bg.addColorStop(0, '#FFFBF5')
			bg.addColorStop(1, '#FFE6D6')
			ctx.setFillStyle(bg)
			ctx.fillRect(0, 0, W, H)

			// 装饰圆
			ctx.setFillStyle('rgba(255,183,77,0.12)')
			ctx.beginPath(); ctx.arc(W * 0.85, 60, 80, 0, Math.PI * 2); ctx.fill()
			ctx.beginPath(); ctx.arc(W * 0.1, H - 80, 60, 0, Math.PI * 2); ctx.fill()

			// ── 顶部品牌栏 ────────────────────────────────────
			ctx.setFillStyle('#FFFFFF')
			this.roundRect(ctx, 20, 20, W - 40, 70, 16)
			ctx.fill()

			ctx.setFontSize(22)
			ctx.setFillStyle('#FF8A65')
			ctx.setTextAlign('left')
			ctx.fillText('🐾 爪印记忆', 36, 62)

			ctx.setFontSize(16)
			ctx.setFillStyle('#A89F9A')
			ctx.setTextAlign('right')
			ctx.fillText(record.createTime || '', W - 36, 62)

			// ── 封面图 ────────────────────────────────────────
			const imgY = 108
			const imgH = 200
			if (assets.cover) {
				ctx.save()
				this.roundRect(ctx, 20, imgY, W - 40, imgH, 16)
				ctx.clip()
				ctx.drawImage(assets.cover, 20, imgY, W - 40, imgH)
				ctx.restore()
			} else {
				const ph = ctx.createLinearGradient(20, imgY, W - 20, imgY + imgH)
				ph.addColorStop(0, '#FFE0CC')
				ph.addColorStop(1, '#FFDAB9')
				ctx.setFillStyle(ph)
				this.roundRect(ctx, 20, imgY, W - 40, imgH, 16)
				ctx.fill()
				ctx.setFontSize(48)
				ctx.setFillStyle('rgba(255,138,101,0.5)')
				ctx.setTextAlign('center')
				ctx.fillText('🐾', W / 2, imgY + imgH / 2 + 16)
			}

			// 图片数量角标
			if (record.mediaUrls && record.mediaUrls.length > 1) {
				ctx.setFillStyle('rgba(0,0,0,0.45)')
				this.roundRect(ctx, W - 70, imgY + imgH - 36, 50, 26, 8)
				ctx.fill()
				ctx.setFontSize(14)
				ctx.setFillStyle('#FFFFFF')
				ctx.setTextAlign('center')
				ctx.fillText(`+${record.mediaUrls.length - 1}`, W - 45, imgY + imgH - 17)
			}

			// ── 用户信息行 ────────────────────────────────────
			const userY = imgY + imgH + 20
			if (assets.avatar) {
				ctx.save()
				ctx.beginPath()
				ctx.arc(44, userY + 20, 20, 0, Math.PI * 2)
				ctx.clip()
				ctx.drawImage(assets.avatar, 24, userY, 40, 40)
				ctx.restore()
			} else {
				ctx.setFillStyle('#FFE0CC')
				ctx.beginPath()
				ctx.arc(44, userY + 20, 20, 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.setFontSize(18)
			ctx.setFillStyle('#5C4A42')
			ctx.setTextAlign('left')
			ctx.fillText(record.nickname || '神秘铲屎官', 74, userY + 16)
			ctx.setFontSize(14)
			ctx.setFillStyle('#A89F9A')
			ctx.fillText(`与 ${record.petName || 'TA'} 的温暖时光`, 74, userY + 34)

			// ── 内容卡片 ──────────────────────────────────────
			const cardY = userY + 56
			const cardH = H - cardY - 120
			ctx.setFillStyle('#FFFFFF')
			ctx.setShadow(0, 4, 12, 'rgba(180,160,140,0.12)')
			this.roundRect(ctx, 20, cardY, W - 40, cardH, 16)
			ctx.fill()
			ctx.setShadow(0, 0, 0, 'transparent')

			// 顶部橙色装饰条
			ctx.setFillStyle('#FF8A65')
			this.roundRect(ctx, 20, cardY, W - 40, 6, 3)
			ctx.fill()

			// 心情标签
			let textStartY = cardY + 24
			if (record.moodTag) {
				ctx.setFillStyle('#FFF0E5')
				this.roundRect(ctx, 36, textStartY, 100, 28, 8)
				ctx.fill()
				ctx.setFontSize(14)
				ctx.setFillStyle('#FF8A65')
				ctx.setTextAlign('left')
				ctx.fillText(record.moodTag, 46, textStartY + 19)
				textStartY += 40
			}

			// 正文（最多 5 行）
			const content = record.content || record.description || ''
			if (content) {
				ctx.setFontSize(17)
				ctx.setFillStyle('#4A3E38')
				ctx.setTextAlign('left')
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
				ctx.setFontSize(14)
				ctx.setFillStyle('#A89F9A')
				ctx.setTextAlign('left')
				ctx.fillText(`📍 ${record.location}`, 36, cardY + cardH - 20)
			}

			// ── 底部：小程序码 + 提示 ─────────────────────────
			const footerY = H - 110
			ctx.setFillStyle('#FFFFFF')
			this.roundRect(ctx, 20, footerY, W - 40, 90, 16)
			ctx.fill()

			if (assets.qr) {
				ctx.drawImage(assets.qr, W - 100, footerY + 10, 70, 70)
			} else {
				// 无小程序码时绘制占位
				ctx.setFillStyle('#F5F0EB')
				this.roundRect(ctx, W - 100, footerY + 10, 70, 70, 8)
				ctx.fill()
				ctx.setFontSize(12)
				ctx.setFillStyle('#BDB3AC')
				ctx.setTextAlign('center')
				ctx.fillText('小程序码', W - 65, footerY + 50)
			}

			ctx.setFontSize(16)
			ctx.setFillStyle('#5C4A42')
			ctx.setTextAlign('left')
			ctx.fillText('扫码查看完整记录', 36, footerY + 34)
			ctx.setFontSize(13)
			ctx.setFillStyle('#A89F9A')
			ctx.fillText('爪印记忆 · 记录与TA的温暖时光', 36, footerY + 56)

			// ── 绘制完成 ──────────────────────────────────────
			ctx.draw(false, () => setTimeout(resolve, 400))
		})
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

	// 导出 Canvas 为图片
	exportCanvas() {
		return new Promise((resolve, reject) => {
			wx.canvasToTempFilePath({
				canvasId: 'posterCanvas',
				fileType: 'jpg',
				quality: 0.95,
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
