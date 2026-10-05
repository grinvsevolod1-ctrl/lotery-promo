import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"
import { site } from "@/lib/site"

export const metadata: Metadata = {
  title: "Контакты — bytoloto.com",
  description: "Способы связи со службой поддержки bytoloto.com.",
  alternates: { canonical: "/contacts" },
}

export default function ContactsPage() {
  return (
    <LegalPage
      current="/contacts"
      title="Контакты"
      lead="Служба поддержки отвечает на вопросы о регистрации, бонусах и тиражах. Претензии рассматриваются в течение 10 рабочих дней."
    >
      <h2>Служба поддержки</h2>
      <ul>
        <li>
          E-mail: <a href={`mailto:${site.operator.email}`}>{site.operator.email}</a>
        </li>
        <li>Время работы: {site.operator.hours}</li>
        {site.social.telegram && (
          <li>
            Telegram: <a href={site.social.telegram} rel="noopener noreferrer" target="_blank">{site.social.telegram}</a>
          </li>
        )}
      </ul>

      <h2>Что указать в обращении</h2>
      <p>
        Чтобы мы разобрались быстрее, напишите e-mail аккаунта, номер билета или тиража и опишите, что произошло. Пароль
        сообщать не нужно — сотрудники поддержки его никогда не запрашивают.
      </p>

      <h2>Ответственная игра</h2>
      <p>
        Участие в акции доступно только лицам старше 18 лет. Если игра перестала быть развлечением, сделайте паузу: аккаунт
        можно удалить в любой момент в разделе «Профиль».
      </p>
    </LegalPage>
  )
}
