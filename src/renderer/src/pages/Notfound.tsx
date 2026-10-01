import { useTranslation } from "react-i18next"

function Notfound() {
  const { t } = useTranslation()
  return <div>{t("Notfound")}</div>
}

export default Notfound
