import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="隐私政策">
      <section>
        <h2 className="font-black text-[#1A1A1A]">一、信息收集</h2>
        <p>为提供注册、登录和主页管理服务，我们会收集账号邮箱、密码哈希、主页资料和用户主动提交的链接信息。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">二、信息使用</h2>
        <p>收集的信息仅用于账号识别、主页展示、服务安全、违规处理和必要的用户支持。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">三、密码安全</h2>
        <p>平台仅保存加密后的 password_hash，不保存用户明文密码，管理员不能查看用户原密码。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">四、举报信息</h2>
        <p>用户提交的举报内容、联系方式和截图仅用于核查违规线索和处理平台安全问题。</p>
      </section>
    </LegalPage>
  );
}
