# Gumroad 收款一条龙教程

> 适合没有公司、只拥有国内银行卡（如招商银行储蓄卡）、没有国外手机号的个人开发者。Gumroad 支持个人销售数字商品、会员订阅和软件授权。以下步骤涵盖从注册、身份验证、发布商品、嵌入到 Cloudflare 网站、到收款提现的完整流程。

##  目录
1. 准备材料
2. 注册 Gumroad 账户
3. 完成身份验证（KYC）
4. 设置商店与页眉页脚
5. 创建并发布商品
6. 配置价格、订阅与优惠
7. 搭建自动交付/授权
8. 在 Cloudflare 网站嵌入 Gumroad 按钮
9. 打款与提现（Payoneer / Wise / 银行卡）
10. 常见问题与排坑

---

## 1. 准备材料

| 项目 | 说明 |
|------|------|
| 邮箱 | 任意可访问的邮箱，推荐 Gmail/Outlook |
| 手机号 | 国内手机号即可，用于登录提醒 |
| 身份证或护照 | KYC 身份验证时使用，需清晰照片 |
| 招商银行储蓄卡 | 后续提现使用，建议开通银联+外币账户 |
| Payoneer / Wise 账户（推荐） | Gumroad 官方支持最快的打款渠道，后续提现到招商卡 |
| 数字商品素材 | 产品文案、封面、交付文件、License 等 |

> 无国外手机号、无公司均可完成注册，Gumroad 允许个人卖家。

---

## 2. 注册 Gumroad 账户

1. 打开 https://gumroad.com  点击右上角 **Start Selling**。
2. 填写邮箱和密码，提交后会收到激活邮件。
3. 在邮箱中点击确认链接，完成账户激活。
4. 登录 Gumroad Dashboard。

Tips：
- 如果页面为英文，可使用浏览器自带翻译。
- 记得开启 2FA（Settings  Security）保障账号安全。

---

## 3. 完成身份验证（KYC）

Gumroad 在你发起提现前需要核实身份：

1. Dashboard 左侧菜单 **Settings  Payouts**。
2. **Legal Info**：
   - Legal name：填写身份证/护照姓名的大写拼音
   - Address：填写英文地址，格式如 `Room 801, Building 3, Chaoyang District, Beijing`
   - Country：China
   - Phone：+86 + 手机号
3. **Identity Verification**：
   - 上传身份证正反面或护照信息页照片（JPG/PNG）
   - 保证边角完整、无遮挡
4. **Tax Forms（W-8BEN）**：
   - Tax residency：China
   - Foreign TIN：填写身份证号码
   - Signature：拼音全名
   - 点击 `Submit`

审核通常 13 个工作日。期间仍可创建商品，但暂不可提现。

---

## 4. 设置商店与页眉页脚

在 **Settings  Profile** 中：
- Username：店铺子域（如 `nanobanana`，则商店链接为 `https://nanobanana.gumroad.com`）
- Display name：对外显示名称
- Bio：一句话介绍
- Avatar / Cover：上传 800x800 头像、1200x400 封面
- Social links：可附上 Cloudflare 网站、Twitter、YouTube 等

在 **Settings  Checkout** 中：
- Currency：默认 USD
- Default language：保持 English（Gumroad 暂不支持中文界面）
- Checkout custom fields：可加自定义信息（如收集 Discord ID）
- Invoice：开启 `Send invoices to customers`

如需自定义域名，可升级 Gumroad Premium，绑定 Cloudflare 域名。

---

## 5. 创建并发布商品

1. 左侧菜单 `Products  New Product`。
2. 选择类型：
   - `Digital Product`（一次性下载）
   - `Membership`（订阅）
   - `Pre-order`（预售）
   - `Course`（课程）
   - `License key`（自动发 License）
3. 填写基础信息：
   - Name / URL
   - Price（单位美元，可输入 0 开启随心付）
   - Description（支持 Markdown）
   - Cover、Thumbnail
4. Content 区：
   - 上传交付文件（ZIP、PDF、视频等）
   - 或使用 `Let customers type an amount` + `Redirect to URL`，将用户重定向至你的网站（如 Cloudflare Pages 会员页面）
5. Workflow：
   - Welcome message
   - License key 模板
   - 配置自动邮件
6. 预览无误后点击 `Publish` 上线。

---

## 6. 配置价格、订阅与优惠

- Price：输入基础价格，如 `29`（表示 $29 USD）。
- Pay-what-you-want：勾选后可设置最小金额，方便客户自定义支持。
- Subscription：开启 `Add a recurring plan`，可同时提供 `Monthly` / `Yearly`，也可添加自定义周期。
- Offer codes：`Customers  Offer Codes` 创建折扣码，支持 % 或 固定金额。
- Pre-order：可设定发布时间，期间用户可预购，文件会在发布日期自动发送。

> Gumroad 内置处理 VAT/GST，不需要自己报税。

---

## 7. 搭建自动交付 / 授权

- **License Keys**：在产品设置中启用 `Generate a unique license key per sale`，可用于软件激活。可在你的网站验证该 key。
- **Zapier / Make**：Gumroad 提供 Webhook，可把订单推送到 Supabase、Notion、Discord 等。
- **API**：访问 https://gumroad.com/api ，使用 `Access Token` 查询销售数据，实现自定义 Dashboard。

---

## 8. 在 Cloudflare 网站嵌入 Gumroad

### 8.1 Overlay 弹窗按钮（推荐）

1. 在产品页面点击 `Share  Embed  Overlay`。
2. 复制 `<a>` 按钮和 `gumroad.js` 脚本。示例：

```html
<a class="gumroad-button" href="https://gumroad.com/l/your-product" data-gumroad-single-product="true">
  立即购买
</a>
<script src="https://gumroad.com/js/gumroad.js"></script>
```

3. 在你的 Cloudflare Pages（如 React 项目）中：
   - 将 `<a>` 写成组件或按钮
   - 在 `index.html` 或页面底部引入脚本
4. 部署后用户点击会弹出 Gumroad 支付弹窗，支付完成后自动交付。

### 8.2 嵌入式结账框

- 在 `Embed` 选项中选择 `Embed`，会生成 `<script src="https://gumroad.com/l/xxx.js">`。
- 将脚本嵌入页面某个容器中，即可直接显示整个结账组件。

### 8.3 跳转到 Gumroad 商店

- 最简单方式：按钮链接到 `https://yourname.gumroad.com/l/product`。
- 适合不想在站内弹窗的场景。

> Gumroad 结账页面已适配移动端，无需额外处理。

---

## 9. 打款与提现

### 9.1 连接 Payoneer / Wise

1. 在 `Settings  Payouts` 选择 Payoneer：
   - 点击 `Connect`，跳转到 Payoneer 注册页
   - 用身份证、银行卡信息完成注册
   - Payoneer 审核通过后，回到 Gumroad 显示 Connected
2. 或使用 `Direct bank transfer`：填写境外银行账号（需 SWIFT），国内个人办理较困难，建议走 Payoneer/Wise。

### 9.2 结算周期
- 每月 131 日的收入在次月 15 日打款。
- 新卖家前几笔会有 714 天缓冲期。

### 9.3 提现到招商银行
1. Gumroad  Payoneer（美元）
2. Payoneer 中添加提现账号：招商银行借记卡（需要银联+SWIFT）
3. Payoneer 发起提现，25 个工作日到帐，支持自动换成人民币。

费用概览：
- Gumroad 免费版：10% + 支付通道费
- Gumroad Premium：3.5% + $10/月订阅
- Payoneer 提现费：1% 左右（视币种）

---

## 10. 常见问题与排坑

| 问题 | 解决方案 |
|------|-----------|
| 账户冻结 / 审核 | 确保商品不侵犯版权，提供清晰 KYC 材料；与支持沟通 support@gumroad.com |
| 国内手机号收不到验证码 | 可使用邮箱登录 + 备份代码，不需要国外手机号 |
| 结账按钮没反应 | 检查是否已加载 `gumroad.js`，或 CSP 是否允许外部脚本 |
| 客户需要发票 | Gumroad Checkout 会自动发送收据，可在 Settings 中自定义 | 
| 想要多语言页面 | Cloudflare Pages 负责展示多语言，Gumroad 仅支持英文界面，可在商品描述提供中英文内容 |
| 退款 | Dashboard  Customers  订单  Issue Refund，手续费不可退还 |

---

## 后续进阶
- 设置 `Email Automations`，购买后自动发送指引或升级信息。
- 使用 `Membership` 功能提供订阅制积分，结合 Cloudflare Worker 验证 License key。
- 通过 `Gumroad API + Supabase` 记录订单，自动为用户开通网站权限。

如需将 Gumroad 订单与本站积分系统或 Supabase 用户体系对接，可继续提问获取示例代码或架构建议。
