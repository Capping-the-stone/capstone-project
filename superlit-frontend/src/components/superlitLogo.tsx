import { useNavigate } from "react-router-dom"

export default function SuperlitLogo() {
  const navigate = useNavigate()
  return (
    <div className="flex justify-center items-center space-x-1 mx-5 cursor-pointer" onClick={() => navigate("/")}>
      <div className="text-black dark:text-white font-bold text-lg">Superlit</div>
      <img src="/rocket.png" width="25" className="inline"></img>
    </div>
  )
}
