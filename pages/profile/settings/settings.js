// pages/profile/settings/settings.js
Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		permissions: {
			album: 'denied',
			camera: 'denied',
			location: 'denied',
			record: 'denied',
			contact: 'denied'
		},
		showTips: true,
		photoResult: null,
		locationResult: null,
		recordingManager: null
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad(options) {
		this.initRecordingManager()
		this.checkAllPermissions()
	},

	/**
	 * 初始化录音管理器
	 */
	initRecordingManager() {
		const recordingManager = wx.getRecorderManager()
		this.setData({ recordingManager })
	},

	/**
	 * 检查所有权限状态
	 */
	checkAllPermissions() {
		wx.getSetting({
			success: (res) => {
				const permissions = {}
				
				// 检查各项权限状态
				permissions.album = res.authSetting['scope.album'] ? 'authorized' : (res.authSetting['scope.album'] === false ? 'denied' : 'undetermined')
				permissions.camera = res.authSetting['scope.camera'] ? 'authorized' : (res.authSetting['scope.camera'] === false ? 'denied' : 'undetermined')
				permissions.location = res.authSetting['scope.userLocation'] ? 'authorized' : (res.authSetting['scope.userLocation'] === false ? 'denied' : 'undetermined')
				permissions.record = res.authSetting['scope.record'] ? 'authorized' : (res.authSetting['scope.record'] === false ? 'denied' : 'undetermined')
				permissions.contact = res.authSetting['scope.addressBook'] ? 'authorized' : (res.authSetting['scope.addressBook'] === false ? 'denied' : 'undetermined')
				
				this.setData({ permissions })
			},
			fail: () => {
				wx.showToast({
					title: '获取权限信息失败',
					icon: 'error'
				})
			}
		})
	},

	/**
	 * 请求相册权限
	 */
	requestAlbumPermission() {
		const that = this
		
		if (this.data.permissions.album === 'authorized') {
			wx.showToast({
				title: '相册权限已开启',
				icon: 'success'
			})
			return
		}

		wx.authorize({
			scope: 'scope.album',
			success: () => {
				wx.showToast({
					title: '相册权限已开启',
					icon: 'success'
				})
				const permissions = this.data.permissions
				permissions.album = 'authorized'
				this.setData({ permissions })
			},
			fail: () => {
				// 如果用户拒绝，引导用户打开设置
				wx.showModal({
					title: '权限提示',
					content: '需要打开相册权限，请在设置中开启',
					confirmText: '去设置',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							wx.openSetting({
								success: (settingRes) => {
									that.checkAllPermissions()
								}
							})
						}
					}
				})
			}
		})
	},

	/**
	 * 请求摄像头权限
	 */
	requestCameraPermission() {
		const that = this
		
		if (this.data.permissions.camera === 'authorized') {
			wx.showToast({
				title: '摄像头权限已开启',
				icon: 'success'
			})
			return
		}

		wx.authorize({
			scope: 'scope.camera',
			success: () => {
				wx.showToast({
					title: '摄像头权限已开启',
					icon: 'success'
				})
				const permissions = this.data.permissions
				permissions.camera = 'authorized'
				this.setData({ permissions })
			},
			fail: () => {
				wx.showModal({
					title: '权限提示',
					content: '需要打开摄像头权限，请在设置中开启',
					confirmText: '去设置',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							wx.openSetting({
								success: (settingRes) => {
									that.checkAllPermissions()
								}
							})
						}
					}
				})
			}
		})
	},

	/**
	 * 请求位置权限
	 */
	requestLocationPermission() {
		const that = this
		
		if (this.data.permissions.location === 'authorized') {
			wx.showToast({
				title: '位置权限已开启',
				icon: 'success'
			})
			return
		}

		wx.authorize({
			scope: 'scope.userLocation',
			success: () => {
				wx.showToast({
					title: '位置权限已开启',
					icon: 'success'
				})
				const permissions = this.data.permissions
				permissions.location = 'authorized'
				this.setData({ permissions })
			},
			fail: () => {
				wx.showModal({
					title: '权限提示',
					content: '需要打开位置权限，请在设置中开启',
					confirmText: '去设置',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							wx.openSetting({
								success: (settingRes) => {
									that.checkAllPermissions()
								}
							})
						}
					}
				})
			}
		})
	},

	/**
	 * 请求麦克风权限
	 */
	requestRecordPermission() {
		const that = this
		
		if (this.data.permissions.record === 'authorized') {
			wx.showToast({
				title: '麦克风权限已开启',
				icon: 'success'
			})
			return
		}

		wx.authorize({
			scope: 'scope.record',
			success: () => {
				wx.showToast({
					title: '麦克风权限已开启',
					icon: 'success'
				})
				const permissions = this.data.permissions
				permissions.record = 'authorized'
				this.setData({ permissions })
			},
			fail: () => {
				wx.showModal({
					title: '权限提示',
					content: '需要打开麦克风权限，请在设置中开启',
					confirmText: '去设置',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							wx.openSetting({
								success: (settingRes) => {
									that.checkAllPermissions()
								}
							})
						}
					}
				})
			}
		})
	},

	/**
	 * 请求通讯录权限
	 */
	requestContactPermission() {
		const that = this
		
		if (this.data.permissions.contact === 'authorized') {
			wx.showToast({
				title: '通讯录权限已开启',
				icon: 'success'
			})
			return
		}

		wx.authorize({
			scope: 'scope.addressBook',
			success: () => {
				wx.showToast({
					title: '通讯录权限已开启',
					icon: 'success'
				})
				const permissions = this.data.permissions
				permissions.contact = 'authorized'
				this.setData({ permissions })
			},
			fail: () => {
				wx.showModal({
					title: '权限提示',
					content: '需要打开通讯录权限，请在设置中开启',
					confirmText: '去设置',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							wx.openSetting({
								success: (settingRes) => {
									that.checkAllPermissions()
								}
							})
						}
					}
				})
			}
		})
	},

	/**
	 * 测试拍照功能
	 */
	testTakePhoto() {
		if (this.data.permissions.camera !== 'authorized') {
			wx.showToast({
				title: '请先授予摄像头权限',
				icon: 'error'
			})
			return
		}

		wx.chooseImage({
			count: 1,
			sizeType: ['compressed'],
			sourceType: ['camera'],
			success: (res) => {
				this.setData({
					photoResult: res.tempFilePaths[0]
				})
				wx.showToast({
					title: '拍照成功',
					icon: 'success'
				})
			},
			fail: () => {
				wx.showToast({
					title: '拍照失败',
					icon: 'error'
				})
			}
		})
	},

	/**
	 * 测试选择图片功能
	 */
	testChooseImage() {
		if (this.data.permissions.album !== 'authorized') {
			wx.showToast({
				title: '请先授予相册权限',
				icon: 'error'
			})
			return
		}

		wx.chooseImage({
			count: 1,
			sizeType: ['compressed'],
			sourceType: ['album'],
			success: (res) => {
				this.setData({
					photoResult: res.tempFilePaths[0]
				})
				wx.showToast({
					title: '选择成功',
					icon: 'success'
				})
			},
			fail: () => {
				wx.showToast({
					title: '选择失败',
					icon: 'error'
				})
			}
		})
	},

	/**
	 * 测试获取位置功能
	 */
	testGetLocation() {
		if (this.data.permissions.location !== 'authorized') {
			wx.showToast({
				title: '请先授予位置权限',
				icon: 'error'
			})
			return
		}

		wx.showLoading({
			title: '获取位置中...'
		})

		wx.getLocation({
			type: 'wgs84',
			success: (res) => {
				wx.hideLoading()
				this.setData({
					locationResult: {
						latitude: res.latitude.toFixed(6),
						longitude: res.longitude.toFixed(6),
						accuracy: Math.round(res.accuracy)
					}
				})
				wx.showToast({
					title: '获取位置成功',
					icon: 'success'
				})
			},
			fail: () => {
				wx.hideLoading()
				wx.showToast({
					title: '获取位置失败',
					icon: 'error'
				})
			}
		})
	},

	/**
	 * 测试录音功能
	 */
	testRecord() {
		if (this.data.permissions.record !== 'authorized') {
			wx.showToast({
				title: '请先授予麦克风权限',
				icon: 'error'
			})
			return
		}

		const recordingManager = this.data.recordingManager
		
		wx.showModal({
			title: '录音测试',
			content: '点击确定开始录音，10秒后自动停止',
			confirmText: '开始',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					recordingManager.start({
						duration: 10000,
						sampleRate: 16000
					})

					wx.showToast({
						title: '正在录音...',
						icon: 'loading',
						duration: 10000
					})

					// 10秒后自动停止
					setTimeout(() => {
						recordingManager.stop()
						wx.hideToast()
						wx.showToast({
							title: '录音完成',
							icon: 'success'
						})
					}, 10000)
				}
			}
		})
	},

	/**
	 * 清除拍照结果
	 */
	clearPhotoResult() {
		this.setData({
			photoResult: null
		})
	},

	/**
	 * 清除位置结果
	 */
	clearLocationResult() {
		this.setData({
			locationResult: null
		})
	},

	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady() {

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow() {
		this.checkAllPermissions()
	},

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide() {

	},

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload() {

	},

	/**
	 * 页面相关事件处理函数--监听用户下拉动作
	 */
	onPullDownRefresh() {

	},

	/**
	 * 页面上拉触底事件的处理函数
	 */
	onReachBottom() {

	},

	/**
	 * 用户点击右上角分享
	 */
	onShareAppMessage() {

	}
})