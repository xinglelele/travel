-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tel` VARCHAR(191) NULL,
    `openid` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `nickname` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `gender` INTEGER NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'zh-CN',
    `register_type` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 0,
    `ai_plan_count` INTEGER NOT NULL DEFAULT 0,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_tel_key`(`tel`),
    UNIQUE INDEX `user_openid_key`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sms_code` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `used` INTEGER NOT NULL DEFAULT 0,
    `expired_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sms_code_phone_type_idx`(`phone`, `type`),
    INDEX `sms_code_expired_at_idx`(`expired_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_prefer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `from_region` INTEGER NOT NULL,
    `preference_tags` JSON NULL,
    `has_completed_onboarding` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_prefer_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `route_name` JSON NOT NULL,
    `total_days` INTEGER NOT NULL,
    `description` JSON NULL,
    `poi_list` JSON NOT NULL,
    `route_detail` JSON NULL,
    `cover_image` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `is_ai_generated` INTEGER NOT NULL DEFAULT 0,
    `source_prompt` VARCHAR(191) NULL,
    `use_count` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `routes_info_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `check_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `poi_id` INTEGER NOT NULL,
    `route_id` INTEGER NULL,
    `check_time` DATETIME(3) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `distance` DECIMAL(10, 2) NULL,
    `stay_mins` INTEGER NULL,
    `hour_tag` INTEGER NOT NULL,
    `week_tag` INTEGER NOT NULL,
    `month_tag` INTEGER NOT NULL,
    `year_tag` INTEGER NOT NULL,
    `day_tag` DATE NOT NULL,
    `note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `check_info_user_id_idx`(`user_id`),
    INDEX `check_info_poi_id_idx`(`poi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `poi_id` INTEGER NOT NULL,
    `route_id` INTEGER NULL,
    `rating` DECIMAL(2, 1) NOT NULL,
    `content` TEXT NOT NULL,
    `images` JSON NULL,
    `helpful_count` INTEGER NOT NULL DEFAULT 0,
    `merchant_reply` TEXT NULL,
    `reply_time` DATETIME(3) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `auditStatus` INTEGER NOT NULL DEFAULT 0,
    `is_reported` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `comment_info_user_id_idx`(`user_id`),
    INDEX `comment_info_poi_id_idx`(`poi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `is_read` INTEGER NOT NULL DEFAULT 0,
    `related_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `message_info_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_share` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `route_id` INTEGER NOT NULL,
    `share_channel` VARCHAR(191) NOT NULL,
    `poster_url` VARCHAR(191) NULL,
    `poster_status` INTEGER NOT NULL DEFAULT 0,
    `extra` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `route_share_user_id_idx`(`user_id`),
    INDEX `route_share_route_id_idx`(`route_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_behavior` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `session_id` VARCHAR(191) NULL,
    `action_type` VARCHAR(191) NOT NULL,
    `target_type` VARCHAR(191) NULL,
    `target_id` INTEGER NULL,
    `keyword` VARCHAR(191) NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_behavior_user_id_idx`(`user_id`),
    INDEX `user_behavior_action_type_idx`(`action_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poi_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_uuid` VARCHAR(191) NOT NULL,
    `poi_type` VARCHAR(191) NULL,
    `type_code` VARCHAR(191) NULL,
    `poi_name` JSON NOT NULL,
    `description` JSON NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `address` JSON NULL,
    `tel` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `photos` JSON NULL,
    `street_view` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `is_free` INTEGER NOT NULL DEFAULT 0,
    `need_tickets` INTEGER NOT NULL DEFAULT 0,
    `official_url` VARCHAR(191) NULL,
    `need_book` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `audit_status` INTEGER NOT NULL DEFAULT 0,
    `audit_remark` VARCHAR(191) NULL,
    `audited_by` INTEGER NULL,
    `audited_at` DATETIME(3) NULL,
    `created_by` INTEGER NULL,
    `embedding` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `poi_info_poi_uuid_key`(`poi_uuid`),
    INDEX `poi_info_poi_uuid_idx`(`poi_uuid`),
    INDEX `poi_info_status_idx`(`status`),
    INDEX `poi_info_district_idx`(`district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poi_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `check_count` INTEGER NOT NULL DEFAULT 0,
    `heat_score` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `avg_stay_time` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `poi_stats_poi_id_key`(`poi_id`),
    UNIQUE INDEX `poi_stats_poi_id_date_key`(`poi_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tag_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `level` INTEGER NOT NULL DEFAULT 1,
    `parent_id` INTEGER NULL,
    `tag_code` VARCHAR(191) NOT NULL,
    `tag_name` JSON NOT NULL,
    `category` VARCHAR(191) NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tag_info_tag_code_key`(`tag_code`),
    INDEX `tag_info_tag_code_idx`(`tag_code`),
    INDEX `tag_info_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poi_tag_rel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `tag_id` INTEGER NOT NULL,
    `weight` DECIMAL(3, 2) NOT NULL DEFAULT 0.5,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `poi_tag_rel_poi_id_tag_id_key`(`poi_id`, `tag_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opening_time` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `time` JSON NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `opening_time_poi_id_idx`(`poi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket_info` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `ticket_name` JSON NOT NULL,
    `description` JSON NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ticket_info_poi_id_idx`(`poi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchant_name` VARCHAR(191) NOT NULL,
    `tel` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `contact_person` VARCHAR(191) NULL,
    `business_license` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `merchant_category` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `reject_reason` VARCHAR(191) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `merchant_tel_key`(`tel`),
    INDEX `merchant_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_poi_rel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchant_id` INTEGER NOT NULL,
    `poi_id` INTEGER NOT NULL,
    `is_primary` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `merchant_poi_rel_merchant_id_poi_id_key`(`merchant_id`, `poi_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `merchant_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status_before` INTEGER NOT NULL,
    `status_after` INTEGER NOT NULL,
    `remark` VARCHAR(191) NULL,
    `reviewer_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `merchant_review_merchant_id_idx`(`merchant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `merchant_poi_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `merchant_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `content` JSON NULL,
    `status_before` INTEGER NOT NULL,
    `status_after` INTEGER NOT NULL,
    `remark` VARCHAR(191) NULL,
    `reviewer_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `merchant_poi_review_poi_id_idx`(`poi_id`),
    INDEX `merchant_poi_review_merchant_id_idx`(`merchant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `tel` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `real_name` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `role` INTEGER NOT NULL DEFAULT 1,
    `status` INTEGER NOT NULL DEFAULT 1,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `government_username_key`(`username`),
    UNIQUE INDEX `government_tel_key`(`tel`),
    INDEX `government_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `government_review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reviewer_id` INTEGER NOT NULL,
    `target_type` VARCHAR(191) NOT NULL,
    `target_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `remark` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `government_review_reviewer_id_idx`(`reviewer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poi_audit_queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `poi_id` INTEGER NOT NULL,
    `submitter_type` VARCHAR(191) NOT NULL,
    `submitter_id` INTEGER NOT NULL,
    `submit_remark` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 0,
    `assigned_to` INTEGER NULL,
    `assigned_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `poi_audit_queue_poi_id_key`(`poi_id`),
    INDEX `poi_audit_queue_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comment_audit_queue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comment_id` INTEGER NOT NULL,
    `report_reason` VARCHAR(191) NULL,
    `reporter_id` INTEGER NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 0,
    `assigned_to` INTEGER NULL,
    `assigned_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `comment_audit_queue_comment_id_key`(`comment_id`),
    INDEX `comment_audit_queue_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `report_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporter_id` INTEGER NOT NULL,
    `target_type` VARCHAR(191) NOT NULL,
    `target_id` INTEGER NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `evidence` JSON NULL,
    `status` INTEGER NOT NULL DEFAULT 0,
    `handler_id` INTEGER NULL,
    `handle_result` VARCHAR(191) NULL,
    `handle_time` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `report_record_reporter_id_idx`(`reporter_id`),
    INDEX `report_record_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `analytics_daily` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `total_users` INTEGER NOT NULL DEFAULT 0,
    `new_users` INTEGER NOT NULL DEFAULT 0,
    `active_users` INTEGER NOT NULL DEFAULT 0,
    `total_pois` INTEGER NOT NULL DEFAULT 0,
    `new_pois` INTEGER NOT NULL DEFAULT 0,
    `total_checks` INTEGER NOT NULL DEFAULT 0,
    `new_checks` INTEGER NOT NULL DEFAULT 0,
    `total_comments` INTEGER NOT NULL DEFAULT 0,
    `new_comments` INTEGER NOT NULL DEFAULT 0,
    `total_routes` INTEGER NOT NULL DEFAULT 0,
    `new_routes` INTEGER NOT NULL DEFAULT 0,
    `total_contents` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `analytics_daily_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `target_scope` VARCHAR(191) NOT NULL DEFAULT 'all',
    `publisher_id` INTEGER NOT NULL,
    `publisher_type` VARCHAR(191) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `announcement_type_idx`(`type`),
    INDEX `announcement_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `official_content` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gov_id` INTEGER NOT NULL,
    `title` JSON NOT NULL,
    `summary` JSON NULL,
    `content` JSON NOT NULL,
    `content_type` VARCHAR(191) NOT NULL,
    `cover_image` VARCHAR(191) NULL,
    `video_url` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `tags` JSON NULL,
    `related_poi_ids` JSON NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `like_count` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NOT NULL DEFAULT 1,
    `published_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `official_content_gov_id_idx`(`gov_id`),
    INDEX `official_content_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_prefer` ADD CONSTRAINT `user_prefer_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes_info` ADD CONSTRAINT `routes_info_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_info` ADD CONSTRAINT `check_info_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_info` ADD CONSTRAINT `check_info_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `check_info` ADD CONSTRAINT `check_info_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_info` ADD CONSTRAINT `comment_info_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_info` ADD CONSTRAINT `comment_info_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_info` ADD CONSTRAINT `comment_info_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes_info`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_info` ADD CONSTRAINT `message_info_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_share` ADD CONSTRAINT `route_share_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_share` ADD CONSTRAINT `route_share_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_behavior` ADD CONSTRAINT `user_behavior_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_info` ADD CONSTRAINT `poi_info_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_info` ADD CONSTRAINT `poi_info_audited_by_fkey` FOREIGN KEY (`audited_by`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_stats` ADD CONSTRAINT `poi_stats_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_tag_rel` ADD CONSTRAINT `poi_tag_rel_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_tag_rel` ADD CONSTRAINT `poi_tag_rel_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `tag_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opening_time` ADD CONSTRAINT `opening_time_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket_info` ADD CONSTRAINT `ticket_info_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_poi_rel` ADD CONSTRAINT `merchant_poi_rel_merchant_id_fkey` FOREIGN KEY (`merchant_id`) REFERENCES `merchant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_poi_rel` ADD CONSTRAINT `merchant_poi_rel_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_review` ADD CONSTRAINT `merchant_review_merchant_id_fkey` FOREIGN KEY (`merchant_id`) REFERENCES `merchant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_review` ADD CONSTRAINT `merchant_review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_poi_review` ADD CONSTRAINT `merchant_poi_review_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_poi_review` ADD CONSTRAINT `merchant_poi_review_merchant_id_fkey` FOREIGN KEY (`merchant_id`) REFERENCES `merchant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `merchant_poi_review` ADD CONSTRAINT `merchant_poi_review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `government_review` ADD CONSTRAINT `government_review_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `government`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_audit_queue` ADD CONSTRAINT `poi_audit_queue_poi_id_fkey` FOREIGN KEY (`poi_id`) REFERENCES `poi_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `poi_audit_queue` ADD CONSTRAINT `poi_audit_queue_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_audit_queue` ADD CONSTRAINT `comment_audit_queue_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comment_info`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_audit_queue` ADD CONSTRAINT `comment_audit_queue_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comment_audit_queue` ADD CONSTRAINT `comment_audit_queue_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_record` ADD CONSTRAINT `report_record_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_record` ADD CONSTRAINT `report_record_handler_id_fkey` FOREIGN KEY (`handler_id`) REFERENCES `government`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `official_content` ADD CONSTRAINT `official_content_gov_id_fkey` FOREIGN KEY (`gov_id`) REFERENCES `government`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
