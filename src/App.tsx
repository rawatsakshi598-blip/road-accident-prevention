import React, { useState } from 'react'
import { Layout } from './components/layout'
import { Dashboard, Datasets, Prediction, EDA, Models, SHAP } from './pages'
import type { TabType } from './types'

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'datasets':
        return <Datasets />
      case 'prediction':
        return <Prediction />
      case 'eda':
        return <EDA />
      case 'models':
        return <Models />
      case 'shap':
        return <SHAP />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  )
}

export default App