import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'

@Component({
  selector: 'app-error-message',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error-message.component.html',
  styleUrl: './error-message.component.scss',
})
export class ErrorMessageComponent {
  readonly message = input.required<string>()
  readonly retry = output()
}
