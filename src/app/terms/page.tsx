import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="用户协议">
      <section>
        <h2 className="font-black text-[#1A1A1A]">一、服务说明</h2>
        <p>Link168 为用户提供个人链接主页创建、展示和管理服务。用户应确保提交的信息真实、合法、有效。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">二、账号使用</h2>
        <p>用户应妥善保管账号和密码。因用户保管不当导致的损失，由用户自行承担。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">三、内容规范</h2>
        <p>用户不得发布违法违规、诈骗、赌博、色情、侵权、黑灰产或其他损害第三方权益的内容。</p>
      </section>
      <section>
        <h2 className="font-black text-[#1A1A1A]">四、违规处理</h2>
        <p>平台发现违规内容后，可依法依规采取下架链接、禁用主页、限制账号或封禁账号等处理措施。</p>
      </section>
    </LegalPage>
  );
}
