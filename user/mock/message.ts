export const messages = [
    {
        id: 'msg-1', type: 'system' as const,
        title: '欢迎使用文旅导览',
        content: '感谢您使用文旅智慧导览小程序，祝您旅途愉快！',
        isRead: false, createdAt: '2024-03-18T09:00:00'
    },
    {
        id: 'msg-2', type: 'route' as const,
        title: '为您推荐新路线',
        content: '根据您的偏好，为您推荐"成都周边两日游"路线，快来看看吧！',
        isRead: false, createdAt: '2024-03-17T15:00:00'
    },
    {
        id: 'msg-3', type: 'comment' as const,
        title: '您的评论获得点赞',
        content: '您对青城山的评论获得了10个有用，感谢您的分享！',
        isRead: true, createdAt: '2024-03-16T11:00:00'
    },
    {
        id: 'msg-4', type: 'activity' as const,
        title: '春季旅游节活动',
        content: '3月20日-4月5日，参与春季旅游节，打卡指定景点赢取好礼！',
        isRead: true, createdAt: '2024-03-15T08:00:00'
    }
]
