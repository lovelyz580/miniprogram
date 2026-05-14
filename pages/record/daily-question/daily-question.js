// daily-question.js
const app = getApp()
const {
	request
} = require('../../../utils/request')
const {
	formatTime,
	UploadImages,
	formatImgUrl
} = require('../../../utils/util')
const urls = require('../../../utils/api')
Page({
	data: {
		// 当前日期
		todayDate: '',
		// 当前宠物
		currentPet: null,
		petList: [],

		// 今日问题
		currentQuestion: null,
		questionId: null,

		// 回答状态
		isAnswered: false,
		answerText: '',
		images: [],

		// 历史记录
		myAnswer: null,
		answeredCount: 0,
		streakDays: 0,
		totalQuestions: 0
	},

	onLoad(options) {
		if (options.id) {
			this.initPage(options.id)
		}else{
			this.initPage()
		}
	
	},
	async getQuestionByid(id){
			try {
				const res = await request({
					url: urls.questiondeail,
					method: 'GET',
					data: {
						answerId: id
					}
				})
				if (res.code === 200) {
					const data = res.data
					// 检查是否已回答
					if (data.myAnswer) {
						let imgUrls = formatImgUrl(data.myAnswer.mediaUrls);
						this.setData({
							currentQuestion: data.question,
							questionId: data.question.questionId,
							isAnswered: true,
							myAnswer: {
								...data.myAnswer,
								images: imgUrls,
	
							},
							answerText: data.myAnswer.content,
							images: imgUrls
						})
					} else {
						this.setData({
							currentQuestion: data.question,
							questionId: data.question.questionId,
							isAnswered: false,
							myAnswer: null,
							answerText: '',
							images: []
						})
					}
				}
			} catch (err) {
				console.error('获取今日问题失败', err)
			}
		},
	onShow() {
		// this.getTodayQuestion()
	},

	// 初始化页面
	async initPage(id) {
		const now = new Date();
		const userInfo = wx.getStorageSync('userInfo')
		this.setData({
			todayDate: formatTime(now, 'yyyy年MM月dd日'),
			userInfo
		})
		await this.getPetList()
		if(id){
			await this.getQuestionByid(id)
		}else{
			await this.getTodayQuestion()
		}
	
		await this.getStatistics()

	},

	// 获取宠物列表
	async getPetList() {
		if (!this.data.userInfo) return
		const result = await app.refreshPetList(this.data.userInfo.userId)
		if (result) {
			const petId = wx.getStorageSync('petId')
			const currentPet = result.petList.find(p => p.petId === petId) || result.petList[0]
			this.setData({
				petList: result.petList,
				currentPet: currentPet
			})
		}
	},

	// 获取统计数据
	async getStatistics() {
		try {
			const petId = wx.getStorageSync('petId');
			let userId = this.data.userInfo.userId;
			const res = await request({
				url: urls.statsquestion,
				method: 'GET',
				data: {
					userId: userId,
					petId: petId
				}
			})

			if (res.code === 200) {
				this.setData({
					totalQuestions: res.data.totalQuestions || 0,
					answeredCount: res.data.answeredCount || 0,
					streakDays: res.data.streakDays || 0
				})
			}
		} catch (err) {
			console.error('获取统计数据失败', err)
		}
	},

	// 获取今日问题
	async getTodayQuestion() {
		try {
			const petId = wx.getStorageSync('petId');
			let userId = this.data.userInfo.userId;
			const res = await request({
				url: urls.todayquestion,
				method: 'GET',
				data: {
					petId: petId,
					userId: userId
				}
			})
			if (res.code === 200) {
				const data = res.data
				// 检查是否已回答
				if (data.myAnswer) {
					let imgUrls = formatImgUrl(data.myAnswer.mediaUrls);
					this.setData({
						currentQuestion: data.question,
						questionId: data.question.questionId,
						isAnswered: true,
						myAnswer: {
							...data.myAnswer,
							images: imgUrls,

						},
						answerText: data.myAnswer.content,
						images: imgUrls
					})
				} else {
					this.setData({
						currentQuestion: data.question,
						questionId: data.question.questionId,
						isAnswered: false,
						myAnswer: null,
						answerText: '',
						images: []
					})
				}
			}
		} catch (err) {
			console.error('获取今日问题失败', err)
		}
	},

	// 获取下一个随机问题
	async getNextQuestion() {
		try {
			wx.showLoading({
				title: '加载中...'
			})

			const res = await request({
				url: urls.randomquestion,
				method: 'GET'
			})
			wx.hideLoading()
			if (res.code === 200 && res.data) {
				this.setData({
					currentQuestion: res.data,
					questionId: res.data.questionId,
					isAnswered: false,
					myAnswer: null,
					answerText: '',
					images: []
				})
			}
		} catch (err) {
			console.error('获取随机问题失败', err)
			wx.hideLoading()
		}
	},

	// 回答输入
	onAnswerInput(e) {
		this.setData({
			answerText: e.detail.value
		})
	},

	// 选择图片
	chooseImage() {
		const remaining = 9 - this.data.images.length
		wx.chooseImage({
			count: remaining,
			sizeType: ['compressed'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				this.setData({
					images: [...this.data.images, ...res.tempFilePaths]
				})
			}
		})
	},

	// 删除图片
	deleteImage(e) {
		const index = e.currentTarget.dataset.index
		const images = [...this.data.images]
		images.splice(index, 1)
		this.setData({
			images
		})
	},

	// 预览回答图片
	previewAnswerImage(e) {
		const index = e.currentTarget.dataset.index
		wx.previewImage({
			current: this.data.images[index],
			urls: this.data.images
		})
	},

	// 提交回答
	async submitAnswer() {
		if (!this.data.answerText.trim()) {
			wx.showToast({
				title: '请输入回答',
				icon: 'none'
			})
			return
		}

		if (!this.data.currentPet) {
			wx.showToast({
				title: '请先添加宠物',
				icon: 'none'
			})
			return
		}

		try {
			wx.showLoading({
				title: '提交中...'
			})
			// 上传图片
			const imageUrls = await UploadImages({
				tempFiles: this.data.images
			});
			console.log(imageUrls)
			const data = {
				questionId: this.data.questionId,
				petId: this.data.currentPet.petId,
				content: this.data.answerText,
				userId: this.data.userInfo.userId,
				images: imageUrls.join(','),
			}
			const res = await request({
				url: urls.answerquestion,
				method: 'POST',
				data
			})

			wx.hideLoading()
			if (res.code === 200) {
				wx.showToast({
					title: '提交成功',
					icon: 'success'
				})
				this.getTodayQuestion()
				// 更新统计数据
				this.getStatistics()
			}
		} catch (err) {
			console.error('提交回答失败', err)
			wx.hideLoading()
		}
	},
	// 跳转历史问答
	goToHistory() {
		wx.navigateTo({
			url: '/pages/record/question-history/question-history'
		})
	},

	// 跳转问答日历
	goToCalendar() {
		wx.navigateTo({
			url: '/pages/record/question-calendar/question-calendar'
		})
	},

	// 切换宠物
	onPetChange(e) {
		const petId = e.detail.value
		const currentPet = this.data.petList.find(p => p.id === petId)

		if (currentPet) {
			wx.setStorageSync('currentPetId', currentPet.id)
			this.setData({
				currentPet
			})
			this.getTodayQuestion()
		}
	}
})