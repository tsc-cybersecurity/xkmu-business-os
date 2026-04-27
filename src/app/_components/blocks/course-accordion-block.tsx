import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'

export interface CourseAccordionBlockItem {
  question: string
  answer: string
}

export interface CourseAccordionBlockContent {
  items?: CourseAccordionBlockItem[]
}

interface Props {
  content: CourseAccordionBlockContent
}

export function CourseAccordionBlock({ content }: Props) {
  const items = content.items ?? []
  return (
    <Accordion type="multiple" className="rounded-md border">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="px-4">
          <AccordionTrigger>{item.question}</AccordionTrigger>
          <AccordionContent>
            <article className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.answer}</ReactMarkdown>
            </article>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
