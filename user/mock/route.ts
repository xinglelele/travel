import { pois } from './poi'

export const routes = [
    {
        id: 'route-1', title: '上海经典两日游', days: 2, totalPoi: 6,
        coverImage: 'https://picsum.photos/seed/route1/400/300',
        tags: ['家族游', '文化', '历史'],
        createdAt: '2024-03-15T10:00:00',
        schedule: [
            { day: 1, description: '黄浦江畔历史文化之旅', pois: [pois[0], pois[1], pois[2]] },
            { day: 2, description: '浦东现代都市体验', pois: [pois[4], pois[5], pois[7]] }
        ]
    },
    {
        id: 'route-2', title: '上海文艺一日游', days: 1, totalPoi: 3,
        coverImage: 'https://picsum.photos/seed/route2/400/300',
        tags: ['情侣游', '文艺', '打卡'],
        createdAt: '2024-03-10T09:00:00',
        schedule: [
            { day: 1, description: '石库门文艺街区漫游', pois: [pois[3], pois[7], pois[1]] }
        ]
    },
    {
        id: 'route-3', title: '上海博物馆深度游', days: 1, totalPoi: 2,
        coverImage: 'https://picsum.photos/seed/route3/400/300',
        tags: ['亲子游', '科普', '文化'],
        createdAt: '2024-03-05T08:00:00',
        schedule: [
            { day: 1, description: '博物馆知识探索之旅', pois: [pois[2], pois[5]] }
        ]
    },
    {
        id: 'route-4', title: '上海水乡古镇游', days: 1, totalPoi: 2,
        coverImage: 'https://picsum.photos/seed/route4/400/300',
        tags: ['休闲游', '古镇', '摄影'],
        createdAt: '2024-03-01T08:00:00',
        schedule: [
            { day: 1, description: '朱家角江南水乡体验', pois: [pois[6], pois[1]] }
        ]
    }
]
